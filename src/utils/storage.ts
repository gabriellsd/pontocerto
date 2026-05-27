import type { AppSettings, AppState, Employee, Holiday, ShiftMark } from '../types';
import { defaultSettings, initialState, STORAGE_KEY } from '../data/defaults';

type LegacyEmployee = Partial<Employee> & {
  id: number;
  name: string;
  dailyHours?: number;
};

function normalizeEmployee(e: LegacyEmployee): Employee {
  let dailyMinutes: number;
  if (typeof e.dailyMinutes === 'number' && e.dailyMinutes > 0) {
    dailyMinutes = e.dailyMinutes;
  } else if (typeof e.dailyHours === 'number') {
    dailyMinutes = Math.round(e.dailyHours * 60);
  } else {
    dailyMinutes = 480;
  }

  return {
    id: e.id,
    name: e.name,
    role: e.role ?? '',
    email: e.email ?? '',
    dailyMinutes,
    regime: e.regime ?? 'Presencial',
    startTime: e.startTime ?? '08:00',
    endTime: e.endTime ?? '17:00',
    lunchMinutes: typeof e.lunchMinutes === 'number' ? e.lunchMinutes : 60,
    weekdaysOnly: e.weekdaysOnly !== false,
  };
}

function clampPayPeriodDay(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? Math.round(value) : fallback;
  return Math.min(31, Math.max(1, n));
}

function clampPositiveNumber(value: unknown, fallback: number): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.max(0, n);
}

function clampMultiplier(value: unknown, fallback: number): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.min(5, Math.max(1, n));
}

function normalizeSettings(s: Partial<AppSettings> | undefined): AppSettings {
  return {
    soundEnabled: s?.soundEnabled ?? defaultSettings.soundEnabled,
    enableWebcam: s?.enableWebcam ?? defaultSettings.enableWebcam,
    enableReminders: s?.enableReminders ?? defaultSettings.enableReminders,
    payPeriodStartDay: clampPayPeriodDay(s?.payPeriodStartDay, defaultSettings.payPeriodStartDay),
    payPeriodEndDay: clampPayPeriodDay(s?.payPeriodEndDay, defaultSettings.payPeriodEndDay),
    payMonthlySalary: clampPositiveNumber(s?.payMonthlySalary, defaultSettings.payMonthlySalary),
    payMonthlyHours: clampPositiveNumber(s?.payMonthlyHours, defaultSettings.payMonthlyHours) || 220,
    payHourlyRate: clampPositiveNumber(s?.payHourlyRate, defaultSettings.payHourlyRate),
    overtimeMultiplier: clampMultiplier(s?.overtimeMultiplier, defaultSettings.overtimeMultiplier),
    shiftMultiplier: clampMultiplier(s?.shiftMultiplier, defaultSettings.shiftMultiplier),
    shiftFlatRate: clampPositiveNumber(s?.shiftFlatRate, defaultSettings.shiftFlatRate),
    shiftWeekendFlatRate: clampPositiveNumber(s?.shiftWeekendFlatRate, defaultSettings.shiftWeekendFlatRate),
  };
}

function isValidState(value: unknown): value is Partial<AppState> {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<AppState>;
  return Array.isArray(v.employees) && Array.isArray(v.logs);
}

function normalizeHolidays(input: unknown): Holiday[] {
  if (!Array.isArray(input)) return [];
  const out: Holiday[] = [];
  const seen = new Set<string>();
  for (const item of input) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Partial<Holiday>;
    if (typeof obj.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(obj.date)) continue;
    if (seen.has(obj.date)) continue;
    seen.add(obj.date);
    out.push({ date: obj.date, label: (obj.label ?? '').toString().slice(0, 80) });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

function normalizeShiftMarks(input: unknown): ShiftMark[] {
  if (!Array.isArray(input)) return [];
  const out: ShiftMark[] = [];
  const seen = new Set<string>();
  for (const item of input) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Partial<ShiftMark>;
    if (typeof obj.employeeId !== 'number' || typeof obj.date !== 'string') continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(obj.date)) continue;
    const key = `${obj.employeeId}|${obj.date}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      employeeId: obj.employeeId,
      date: obj.date,
      note: (obj.note ?? '').toString().slice(0, 200),
      markedAt: typeof obj.markedAt === 'string' ? obj.markedAt : new Date().toISOString(),
    });
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

export function normalizeState(input: Partial<AppState>): AppState {
  const employees = (input.employees ?? []).map((e) => normalizeEmployee(e));
  return {
    employees,
    logs: input.logs ?? [],
    shiftMarks: normalizeShiftMarks(input.shiftMarks),
    holidays: normalizeHolidays(input.holidays),
    currentEmployeeId:
      typeof input.currentEmployeeId === 'number' ? input.currentEmployeeId : employees[0]?.id ?? 1,
    isDarkMode: Boolean(input.isDarkMode),
    settings: normalizeSettings(input.settings),
  };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(initialState);
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidState(parsed)) return structuredClone(initialState);
    return normalizeState(parsed);
  } catch (e) {
    console.error('Falha a ler localStorage', e);
    return structuredClone(initialState);
  }
}

export function saveState(state: AppState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    console.error('Falha a guardar localStorage', e);
    return false;
  }
}
