import { useEffect, useRef, useState } from 'react';

export type AutoSaveStatus = 'idle' | 'pending' | 'saved';

interface UseAutoSaveOptions<T> {
  value: T;
  onSave: (value: T) => void;
  delay?: number;
  enabled?: boolean;
  isEqual?: (a: T, b: T) => boolean;
}

const defaultEqual = <T,>(a: T, b: T) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Auto-save de um valor com debounce. Dispara `onSave` quando o valor muda e
 * fica estável durante `delay` ms. Retorna um estado para feedback visual.
 */
export function useAutoSave<T>({
  value,
  onSave,
  delay = 600,
  enabled = true,
  isEqual = defaultEqual,
}: UseAutoSaveOptions<T>): AutoSaveStatus {
  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const lastSavedRef = useRef<T>(value);
  const onSaveRef = useRef(onSave);
  const savedTimerRef = useRef<number | null>(null);
  const debounceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    if (!enabled) return;
    if (isEqual(value, lastSavedRef.current)) {
      return;
    }
    setStatus('pending');
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = window.setTimeout(() => {
      onSaveRef.current(value);
      lastSavedRef.current = value;
      setStatus('saved');
      if (savedTimerRef.current) {
        window.clearTimeout(savedTimerRef.current);
      }
      savedTimerRef.current = window.setTimeout(() => setStatus('idle'), 1800);
    }, delay);

    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, [value, enabled, delay, isEqual]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current);
      if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current);
    };
  }, []);

  return status;
}
