import { useMemo, useState } from 'react';
import { CalendarOff, Plus, Trash2 } from 'lucide-react';
import type { Holiday } from '../../types';
import { SettingsSection } from './SettingsSection';
import { formatDateBR, getDayLabelShort } from '../../utils/time';

interface HolidaysSectionProps {
  holidays: Holiday[];
  onSetHoliday: (date: string, label: string) => void;
  onRemoveHoliday: (date: string) => void;
}

export function HolidaysSection({ holidays, onSetHoliday, onRemoveHoliday }: HolidaysSectionProps) {
  const [date, setDate] = useState('');
  const [label, setLabel] = useState('');

  const sorted = useMemo(
    () => [...holidays].sort((a, b) => a.date.localeCompare(b.date)),
    [holidays]
  );

  const canAdd = /^\d{4}-\d{2}-\d{2}$/.test(date);

  const add = () => {
    if (!canAdd) return;
    onSetHoliday(date, label.trim());
    setDate('');
    setLabel('');
  };

  return (
    <SettingsSection
      Icon={CalendarOff}
      title="Feriados"
      description="Feriados na sua escala contam como plantão (R$ 150) — cadastre as datas aqui"
    >
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="ponto-input sm:w-44"
            aria-label="Data do feriado"
          />
          <input
            type="text"
            placeholder="Ex: Natal, Tiradentes (opcional)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={80}
            className="ponto-input flex-1"
            aria-label="Descrição do feriado"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canAdd) {
                e.preventDefault();
                add();
              }
            }}
          />
          <button
            type="button"
            disabled={!canAdd}
            onClick={add}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Adicionar
          </button>
        </div>

        {sorted.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 italic px-1">
            Nenhum feriado registado.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/40 overflow-hidden">
            {sorted.map((h) => (
              <li
                key={h.date}
                className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-white dark:hover:bg-slate-800 transition"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 text-[10px] font-bold uppercase rounded">
                    {getDayLabelShort(h.date)}
                  </span>
                  <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {formatDateBR(h.date)}
                  </span>
                  {h.label && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      · {h.label}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveHoliday(h.date)}
                  className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition shrink-0"
                  aria-label={`Remover feriado de ${formatDateBR(h.date)}`}
                  title="Remover"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SettingsSection>
  );
}
