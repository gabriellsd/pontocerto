import { useRef } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  formatDateBR,
  formatTimeStr,
  getDayLabelShort,
  isWeekend,
  shiftDateStr,
} from '../../utils/time';

interface DateSelectorProps {
  selectedDate: string;
  todayStr: string;
  now: Date;
  onChange: (next: string) => void;
}

export function DateSelector({ selectedDate, todayStr, now, onChange }: DateSelectorProps) {
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const isToday = selectedDate === todayStr;
  const weekend = isWeekend(selectedDate);

  const openPicker = () => {
    const input = dateInputRef.current;
    if (!input) return;
    if (typeof input.showPicker === 'function') {
      input.showPicker();
    } else {
      input.focus();
      input.click();
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm px-2 py-1.5 sm:px-3 sm:py-2 flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(shiftDateStr(selectedDate, -1))}
        aria-label="Dia anterior"
        className="p-1.5 sm:p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition shrink-0"
      >
        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>

      <button
        type="button"
        onClick={openPicker}
        className="flex-1 flex items-center justify-center gap-2 px-2 sm:px-3 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition group min-w-0"
        aria-label="Escolher data"
      >
        <CalendarDays className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
        <div className="min-w-0 text-left sm:text-center leading-tight">
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            {isToday ? (
              <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-mono tracking-wide">
                Hoje · {formatTimeStr(now)}
              </span>
            ) : (
              <>
                <span className="font-bold text-sm sm:text-base text-slate-800 dark:text-white font-mono">
                  {formatDateBR(selectedDate)}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                    weekend
                      ? 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {getDayLabelShort(selectedDate)}
                </span>
              </>
            )}
          </div>
        </div>
        <input
          ref={dateInputRef}
          type="date"
          value={selectedDate}
          onChange={(e) => {
            if (e.target.value) onChange(e.target.value);
          }}
          className="sr-only"
          aria-hidden
          tabIndex={-1}
        />
      </button>

      <button
        type="button"
        onClick={() => onChange(shiftDateStr(selectedDate, 1))}
        disabled={isToday}
        aria-label="Próximo dia"
        className="p-1.5 sm:p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition shrink-0"
      >
        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>

      {!isToday && (
        <button
          type="button"
          onClick={() => onChange(todayStr)}
          className="ml-1 px-2.5 py-1 sm:py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg shadow-sm transition shrink-0"
        >
          Hoje
        </button>
      )}
    </div>
  );
}
