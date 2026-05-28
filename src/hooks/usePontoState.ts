import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppSettings, AppState, Employee, Holiday, PointLog, ShiftMark } from '../types';
import { pushRemoteState, statesEqual, subscribeRemoteState } from '../firebase/stateSync';
import { initialState } from '../data/defaults';
import { loadState, saveState } from '../utils/storage';

export type SyncStatus = 'loading' | 'syncing' | 'synced' | 'offline' | 'error';

export interface PontoApi {
  state: AppState;
  currentEmployee: Employee | undefined;
  syncStatus: SyncStatus;
  lastSyncedAt: Date | null;
  toggleDarkMode: () => void;
  addLog: (log: PointLog) => void;
  upsertLog: (log: PointLog) => void;
  removeLog: (employeeId: number, date: string, type: PointLog['type']) => void;
  addLogs: (logs: PointLog[], opts?: { overwrite?: boolean }) => { added: number; replaced: number };
  updateEmployee: (id: number, patch: Partial<Omit<Employee, 'id'>>) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  setHoliday: (date: string, label: string) => void;
  removeHoliday: (date: string) => void;
  setShiftMark: (mark: Omit<ShiftMark, 'markedAt'> & { markedAt?: string }) => void;
  removeShiftMark: (employeeId: number, date: string) => void;
  replaceState: (next: AppState) => void;
  resetData: () => void;
  clearPoints: () => void;
}

const SAVE_DEBOUNCE_MS = 600;

function hasPointData(state: AppState): boolean {
  return state.logs.length > 0 || state.shiftMarks.length > 0;
}

export function usePontoState(userId: string, onStorageFull?: () => void): PontoApi {
  const [state, setState] = useState<AppState>(() => loadState());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('loading');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const hydratedRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);
  const lastSyncedStateRef = useRef<AppState | null>(null);
  const pushingRef = useRef(false);
  const firstSnapshotRef = useRef(true);

  useEffect(() => {
    hydratedRef.current = false;
    firstSnapshotRef.current = true;
    lastSyncedStateRef.current = null;
    setSyncStatus('loading');

    let cancelled = false;

    const unsub = subscribeRemoteState(
      userId,
      async (remote) => {
        if (cancelled) return;

        if (firstSnapshotRef.current) {
          firstSnapshotRef.current = false;
          const local = loadState();

          if (remote) {
            lastSyncedStateRef.current = remote;
            setState(remote);
          } else if (hasPointData(local)) {
            try {
              await pushRemoteState(userId, local);
              lastSyncedStateRef.current = local;
              setState(local);
            } catch (err) {
              console.warn('Falha ao enviar dados locais para a nuvem:', err);
              lastSyncedStateRef.current = local;
              setState(local);
              setSyncStatus('offline');
              hydratedRef.current = true;
              return;
            }
          } else {
            lastSyncedStateRef.current = local;
            setState(local);
          }

          hydratedRef.current = true;
          setSyncStatus('synced');
          setLastSyncedAt(new Date());
          return;
        }

        if (!remote || pushingRef.current) return;
        if (lastSyncedStateRef.current && statesEqual(lastSyncedStateRef.current, remote)) return;

        lastSyncedStateRef.current = remote;
        setState(remote);
        setSyncStatus('synced');
        setLastSyncedAt(new Date());
      },
      (err) => {
        console.warn('Firestore indisponível, a usar cache local:', err);
        if (cancelled) return;
        setSyncStatus('offline');
        hydratedRef.current = true;
      }
    );

    return () => {
      cancelled = true;
      unsub();
    };
  }, [userId]);

  useEffect(() => {
    const ok = saveState(state);
    if (!ok && onStorageFull) onStorageFull();
  }, [state, onStorageFull]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    if (lastSyncedStateRef.current && statesEqual(lastSyncedStateRef.current, state)) return;

    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }
    setSyncStatus((prev) => (prev === 'offline' ? prev : 'syncing'));

    saveTimerRef.current = window.setTimeout(async () => {
      pushingRef.current = true;
      try {
        await pushRemoteState(userId, state);
        lastSyncedStateRef.current = state;
        setSyncStatus('synced');
        setLastSyncedAt(new Date());
      } catch (err) {
        console.warn('Falha a sincronizar com Firebase:', err);
        setSyncStatus('offline');
      } finally {
        pushingRef.current = false;
      }
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [state, userId]);

  useEffect(() => {
    const root = document.documentElement;
    if (state.isDarkMode) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
  }, [state.isDarkMode]);

  const currentEmployee = useMemo(
    () => state.employees.find((e) => e.id === state.currentEmployeeId),
    [state.employees, state.currentEmployeeId]
  );

  const toggleDarkMode = useCallback(() => {
    setState((s) => ({ ...s, isDarkMode: !s.isDarkMode }));
  }, []);

  const addLog = useCallback((log: PointLog) => {
    setState((s) => ({ ...s, logs: [...s.logs, log] }));
  }, []);

  const upsertLog = useCallback((log: PointLog) => {
    setState((s) => {
      const idx = s.logs.findIndex(
        (l) => l.employeeId === log.employeeId && l.date === log.date && l.type === log.type
      );
      const logs = [...s.logs];
      if (idx >= 0) logs[idx] = log;
      else logs.push(log);
      return { ...s, logs };
    });
  }, []);

  const removeLog = useCallback(
    (employeeId: number, date: string, type: PointLog['type']) => {
      setState((s) => ({
        ...s,
        logs: s.logs.filter(
          (l) => !(l.employeeId === employeeId && l.date === date && l.type === type)
        ),
      }));
    },
    []
  );

  const addLogs = useCallback(
    (newLogs: PointLog[], opts: { overwrite?: boolean } = {}) => {
      let added = 0;
      let replaced = 0;
      setState((s) => {
        const key = (l: PointLog) => `${l.employeeId}|${l.date}|${l.type}`;
        const map = new Map<string, PointLog>();
        for (const l of s.logs) map.set(key(l), l);
        for (const l of newLogs) {
          const k = key(l);
          if (map.has(k)) {
            if (opts.overwrite) {
              map.set(k, l);
              replaced++;
            }
          } else {
            map.set(k, l);
            added++;
          }
        }
        const logs = [...map.values()].sort((a, b) =>
          (a.date + a.time).localeCompare(b.date + b.time)
        );
        return { ...s, logs };
      });
      return { added, replaced };
    },
    []
  );

  const updateEmployee = useCallback((id: number, patch: Partial<Omit<Employee, 'id'>>) => {
    setState((s) => ({
      ...s,
      employees: s.employees.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
  }, []);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  }, []);

  const setHoliday = useCallback((date: string, label: string) => {
    setState((s) => {
      const others = s.holidays.filter((h) => h.date !== date);
      const next: Holiday = { date, label: label.trim().slice(0, 80) };
      return {
        ...s,
        holidays: [...others, next].sort((a, b) => a.date.localeCompare(b.date)),
      };
    });
  }, []);

  const removeHoliday = useCallback((date: string) => {
    setState((s) => ({
      ...s,
      holidays: s.holidays.filter((h) => h.date !== date),
    }));
  }, []);

  const setShiftMark = useCallback((mark: Omit<ShiftMark, 'markedAt'> & { markedAt?: string }) => {
    const entry: ShiftMark = {
      employeeId: mark.employeeId,
      date: mark.date,
      note: mark.note.trim().slice(0, 200),
      markedAt: mark.markedAt ?? new Date().toISOString(),
    };
    setState((s) => {
      const others = s.shiftMarks.filter(
        (m) => !(m.employeeId === entry.employeeId && m.date === entry.date)
      );
      return { ...s, shiftMarks: [...others, entry] };
    });
  }, []);

  const removeShiftMark = useCallback((employeeId: number, date: string) => {
    setState((s) => ({
      ...s,
      shiftMarks: s.shiftMarks.filter((m) => !(m.employeeId === employeeId && m.date === date)),
    }));
  }, []);

  const replaceState = useCallback((next: AppState) => {
    setState(next);
  }, []);

  const resetData = useCallback(() => {
    setState(structuredClone(initialState));
  }, []);

  const clearPoints = useCallback(() => {
    setState((s) => ({
      ...s,
      logs: [],
      shiftMarks: [],
    }));
  }, []);

  return {
    state,
    currentEmployee,
    syncStatus,
    lastSyncedAt,
    toggleDarkMode,
    addLog,
    upsertLog,
    removeLog,
    addLogs,
    updateEmployee,
    updateSettings,
    setHoliday,
    removeHoliday,
    setShiftMark,
    removeShiftMark,
    replaceState,
    resetData,
    clearPoints,
  };
}
