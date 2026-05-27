import { useEffect, useRef, useState } from 'react';
import { Banknote } from 'lucide-react';
import type { AppSettings } from '../../types';
import { formatBRL, resolveHourlyRate, usesShiftFlatRate } from '../../utils/payCalculator';
import { SettingsSection } from './SettingsSection';
import { AutoSaveIndicator } from './AutoSaveIndicator';
import type { AutoSaveStatus } from '../../hooks/useAutoSave';

interface PaySectionProps {
  settings: AppSettings;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
}

function useFlashSavedStatus(signature: string): AutoSaveStatus {
  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const firstRef = useRef(true);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (firstRef.current) {
      firstRef.current = false;
      return;
    }
    setStatus('saved');
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setStatus('idle'), 1800);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [signature]);

  return status;
}

function parseMoney(raw: string): number {
  const parsed = parseFloat(raw.replace(',', '.'));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function parseIntField(raw: string, fallback: number, min = 0): number {
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) ? Math.max(min, parsed) : fallback;
}

function parseMultiplier(raw: string, fallback: number): number {
  const parsed = parseFloat(raw.replace(',', '.'));
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(5, Math.max(1, parsed));
}

export function PaySection({ settings, onUpdateSettings }: PaySectionProps) {
  const signature = `${settings.payMonthlySalary}|${settings.payMonthlyHours}|${settings.payHourlyRate}|${settings.overtimeMultiplier}|${settings.shiftMultiplier}|${settings.shiftFlatRate}|${settings.shiftWeekendFlatRate}`;
  const status = useFlashSavedStatus(signature);
  const hourlyPreview = resolveHourlyRate(settings);
  const flatShift = usesShiftFlatRate(settings);

  return (
    <SettingsSection
      Icon={Banknote}
      title="Remuneração"
      description="Hora extra pelo banco de horas; plantão valor fixo por dia"
      actions={<AutoSaveIndicator status={status} />}
    >
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Salário base mensal (R$)">
            <input
              type="number"
              min={0}
              step={0.01}
              value={settings.payMonthlySalary || ''}
              onChange={(e) => onUpdateSettings({ payMonthlySalary: parseMoney(e.target.value) })}
              placeholder="Ex: 3390"
              className="ponto-input"
            />
          </Field>
          <Field label="Horas mensais (referência)">
            <input
              type="number"
              min={1}
              step={1}
              value={settings.payMonthlyHours}
              onChange={(e) =>
                onUpdateSettings({ payMonthlyHours: parseIntField(e.target.value, settings.payMonthlyHours, 1) })
              }
              className="ponto-input"
            />
          </Field>
          <Field label="Valor hora (R$) — opcional">
            <input
              type="number"
              min={0}
              step={0.01}
              value={settings.payHourlyRate || ''}
              onChange={(e) => onUpdateSettings({ payHourlyRate: parseMoney(e.target.value) })}
              placeholder="Prioridade sobre salário ÷ horas"
              className="ponto-input"
            />
          </Field>
          <div className="p-2 bg-brand-50 dark:bg-brand-950/30 rounded-lg border border-brand-100 dark:border-brand-900/40 flex flex-col justify-center">
            <span className="text-[10px] font-bold text-brand-700/80 dark:text-brand-400/80 uppercase tracking-wider">
              Valor hora (banco 50%)
            </span>
            <span className="text-sm font-bold font-mono text-brand-700 dark:text-brand-300 mt-0.5">
              {hourlyPreview > 0 ? formatBRL(hourlyPreview) : '— configure acima'}
            </span>
            {hourlyPreview > 0 && (
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                H.E. ×{settings.overtimeMultiplier} = {formatBRL(hourlyPreview * settings.overtimeMultiplier)}/h
              </span>
            )}
          </div>
        </div>

        <div className="p-2.5 bg-indigo-50/60 dark:bg-indigo-950/20 rounded-lg border border-indigo-100 dark:border-indigo-900/40 space-y-2">
          <p className="text-xs font-semibold text-indigo-800 dark:text-indigo-300">Plantão — valor fixo por dia</p>
          <div className="grid grid-cols-2 sm:max-w-md gap-2">
            <Field label="Dia útil / feriado (R$)">
              <input
                type="number"
                min={0}
                step={0.01}
                value={settings.shiftFlatRate || ''}
                onChange={(e) => onUpdateSettings({ shiftFlatRate: parseMoney(e.target.value) })}
                placeholder="150"
                className="ponto-input"
              />
            </Field>
            <Field label="Sábado e domingo (R$)">
              <input
                type="number"
                min={0}
                step={0.01}
                value={settings.shiftWeekendFlatRate || ''}
                onChange={(e) => onUpdateSettings({ shiftWeekendFlatRate: parseMoney(e.target.value) })}
                placeholder="150"
                className="ponto-input"
              />
            </Field>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
            Cada dia na escala conta 1× plantão fixo. Sábado com ponto: também H.E. pelas horas (×1,5).
            Domingo e feriado: só plantão fixo (marque sem horários ou registe — horas não somam H.E.).
            Deixe plantão dia útil em 0 para calcular plantão só por hora (× multiplicador abaixo).
          </p>
        </div>

        {!flatShift && (
          <div className="grid grid-cols-2 sm:max-w-md gap-3">
            <Field label={`Plantão por hora (×${settings.shiftMultiplier})`}>
              <input
                type="number"
                min={1}
                max={5}
                step={0.05}
                value={settings.shiftMultiplier}
                onChange={(e) =>
                  onUpdateSettings({ shiftMultiplier: parseMultiplier(e.target.value, settings.shiftMultiplier) })
                }
                className="ponto-input"
              />
            </Field>
            <Field label={`Hora extra / banco (×${settings.overtimeMultiplier})`}>
              <input
                type="number"
                min={1}
                max={5}
                step={0.05}
                value={settings.overtimeMultiplier}
                onChange={(e) =>
                  onUpdateSettings({ overtimeMultiplier: parseMultiplier(e.target.value, settings.overtimeMultiplier) })
                }
                className="ponto-input"
              />
            </Field>
          </div>
        )}

        {flatShift && (
          <Field label={`Hora extra / banco de horas (×${settings.overtimeMultiplier})`}>
            <input
              type="number"
              min={1}
              max={5}
              step={0.05}
              value={settings.overtimeMultiplier}
              onChange={(e) =>
                onUpdateSettings({ overtimeMultiplier: parseMultiplier(e.target.value, settings.overtimeMultiplier) })
              }
              className="ponto-input sm:max-w-[8rem]"
            />
          </Field>
        )}
      </div>
    </SettingsSection>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-0.5">
      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
      {children}
    </label>
  );
}
