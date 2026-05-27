import { useEffect, useMemo, useState } from 'react';
import { Clock } from 'lucide-react';
import type { Employee } from '../../types';
import { SettingsSection } from './SettingsSection';
import { Toggle } from './Toggle';
import { AutoSaveIndicator } from './AutoSaveIndicator';
import { useAutoSave } from '../../hooks/useAutoSave';
import { diffInMinutes, formatHM } from '../../utils/time';
import { TimeInput, TIME_24H_RE } from '../inputs/TimeInput';

interface ScheduleSectionProps {
  employee: Employee;
  onSave: (patch: Partial<Omit<Employee, 'id'>>) => void;
}

interface FormState {
  startTime: string;
  endTime: string;
  dailyH: number;
  dailyM: number;
  lunchMinutes: number;
  weekdaysOnly: boolean;
}

function toForm(emp: Employee): FormState {
  return {
    startTime: emp.startTime,
    endTime: emp.endTime,
    dailyH: Math.floor(emp.dailyMinutes / 60),
    dailyM: emp.dailyMinutes % 60,
    lunchMinutes: emp.lunchMinutes,
    weekdaysOnly: emp.weekdaysOnly,
  };
}

const TIME_RE = TIME_24H_RE;

export function ScheduleSection({ employee, onSave }: ScheduleSectionProps) {
  const [form, setForm] = useState<FormState>(() => toForm(employee));

  useEffect(() => {
    setForm(toForm(employee));
  }, [
    employee.id,
    employee.startTime,
    employee.endTime,
    employee.dailyMinutes,
    employee.lunchMinutes,
    employee.weekdaysOnly,
  ]);

  const dailyMinutes = form.dailyH * 60 + form.dailyM;
  const grossMinutes = diffInMinutes(form.startTime, form.endTime);
  const expectedLunch = Math.max(0, grossMinutes - dailyMinutes);
  const lunchMismatch = Math.abs(expectedLunch - form.lunchMinutes) > 1 && grossMinutes > 0;

  const isValid =
    TIME_RE.test(form.startTime) &&
    TIME_RE.test(form.endTime) &&
    dailyMinutes > 0 &&
    dailyMinutes <= 24 * 60 &&
    form.lunchMinutes >= 0 &&
    form.lunchMinutes <= 240;

  const patch = useMemo(
    () => ({
      startTime: form.startTime,
      endTime: form.endTime,
      dailyMinutes,
      lunchMinutes: form.lunchMinutes,
      weekdaysOnly: form.weekdaysOnly,
    }),
    [form.startTime, form.endTime, dailyMinutes, form.lunchMinutes, form.weekdaysOnly]
  );

  const status = useAutoSave({
    value: patch,
    enabled: isValid,
    onSave: (next) => onSave(next),
  });

  return (
    <SettingsSection
      Icon={Clock}
      title="Jornada de Trabalho"
      description="Horário esperado, duração do almoço e contagem de fim-de-semana"
      actions={<AutoSaveIndicator status={status} />}
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field id="sched-start" label="Entrada">
            <TimeInput
              id="sched-start"
              value={form.startTime}
              onChange={(v) => setForm({ ...form, startTime: v })}
              invalid={form.startTime.length > 0 && !TIME_RE.test(form.startTime)}
              className="ponto-input"
            />
          </Field>
          <Field id="sched-end" label="Saída">
            <TimeInput
              id="sched-end"
              value={form.endTime}
              onChange={(v) => setForm({ ...form, endTime: v })}
              invalid={form.endTime.length > 0 && !TIME_RE.test(form.endTime)}
              className="ponto-input"
            />
          </Field>
          <Field id="sched-lunch" label="Almoço (min)">
            <input
              id="sched-lunch"
              type="number"
              min={0}
              max={240}
              value={form.lunchMinutes}
              onChange={(e) =>
                setForm({ ...form, lunchMinutes: Math.max(0, parseInt(e.target.value, 10) || 0) })
              }
              className="ponto-input"
            />
          </Field>
          <Field id="sched-daily" label="Jornada efetiva">
            <div className="flex items-center gap-2">
              <input
                id="sched-daily"
                type="number"
                min={0}
                max={23}
                value={form.dailyH}
                onChange={(e) =>
                  setForm({
                    ...form,
                    dailyH: Math.min(23, Math.max(0, parseInt(e.target.value, 10) || 0)),
                  })
                }
                className="ponto-input"
                aria-label="Horas"
              />
              <span className="text-slate-400 font-bold">:</span>
              <input
                type="number"
                min={0}
                max={59}
                value={form.dailyM}
                onChange={(e) =>
                  setForm({
                    ...form,
                    dailyM: Math.min(59, Math.max(0, parseInt(e.target.value, 10) || 0)),
                  })
                }
                className="ponto-input"
                aria-label="Minutos"
              />
            </div>
          </Field>
        </div>

        <Toggle
          id="sched-weekdays"
          checked={form.weekdaysOnly}
          onChange={(weekdaysOnly) => setForm({ ...form, weekdaysOnly })}
          label="Apenas dias úteis (Segunda a Sexta)"
          description="Se ligado, trabalho ao sábado/domingo conta como hora extra e não como expectativa de jornada."
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <Stat label="Período total" value={grossMinutes > 0 ? formatHM(grossMinutes) : '--'} />
          <Stat label="Jornada efetiva" value={formatHM(dailyMinutes)} highlight />
          <Stat
            label="Almoço configurado"
            value={formatHM(form.lunchMinutes)}
            warning={lunchMismatch}
            warningText={lunchMismatch ? `Esperado: ${formatHM(expectedLunch)}` : undefined}
          />
        </div>
      </div>
    </SettingsSection>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  );
}

interface StatProps {
  label: string;
  value: string;
  highlight?: boolean;
  warning?: boolean;
  warningText?: string;
}

function Stat({ label, value, highlight, warning, warningText }: StatProps) {
  const valueCls = warning
    ? 'text-amber-600 dark:text-amber-400'
    : highlight
    ? 'text-brand-600 dark:text-brand-400'
    : 'text-slate-700 dark:text-slate-200';
  return (
    <div className="p-2 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-100 dark:border-slate-800">
      <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium uppercase tracking-wide">{label}</span>
      <span className={`font-mono font-bold text-sm ${valueCls}`}>{value}</span>
      {warningText && (
        <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
          {warningText}
        </span>
      )}
    </div>
  );
}
