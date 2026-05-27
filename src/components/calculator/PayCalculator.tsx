import { useMemo, useState } from 'react';
import { Calculator } from 'lucide-react';
import type { AppSettings, Employee, PointLog, ShiftMark } from '../../types';
import {
  computeManualPay,
  computePeriodPay,
  formatBRL,
  type ManualShiftKind,
  type PayKind,
  resolveHourlyRate,
  usesShiftFlatRate,
} from '../../utils/payCalculator';
import { formatHM, formatSigned } from '../../utils/time';

interface PayCalculatorProps {
  settings: AppSettings;
  employee: Employee;
  logsByDate: Map<string, PointLog[]>;
  shiftMarks: ShiftMark[];
  holidaySet: Set<string>;
}

type Mode = 'period' | 'manual';

function shiftPeriodSub(pay: ReturnType<typeof computePeriodPay>, settings: AppSettings): string {
  if (!pay.shiftUsesFlatRate) {
    return `×${settings.shiftMultiplier} · ${formatHM(pay.shiftMinutes)}`;
  }
  const parts: string[] = [];
  if (pay.shiftWeekendDays > 0) {
    parts.push(`${pay.shiftWeekendDays}× sáb/dom ${formatBRL(settings.shiftWeekendFlatRate)}`);
  }
  if (pay.shiftHolidayDays > 0) {
    parts.push(`${pay.shiftHolidayDays}× feriado ${formatBRL(settings.shiftFlatRate)}`);
  }
  if (pay.shiftWeekdayDays > 0) {
    parts.push(`${pay.shiftWeekdayDays}× plantão ${formatBRL(settings.shiftFlatRate)}`);
  }
  return parts.length ? parts.join(' · ') : '0 dias na escala';
}

export function PayCalculator({ settings, employee, logsByDate, shiftMarks, holidaySet }: PayCalculatorProps) {
  const [mode, setMode] = useState<Mode>('period');
  const [manualKind, setManualKind] = useState<PayKind>('overtime');
  const [manualShiftKind, setManualShiftKind] = useState<ManualShiftKind>('weekday');
  const [manualHours, setManualHours] = useState(0);
  const [manualMinutes, setManualMinutes] = useState(0);
  const [manualShiftDays, setManualShiftDays] = useState(1);

  const flatShift = usesShiftFlatRate(settings);
  const hourlyRate = resolveHourlyRate(settings);
  const periodPay = useMemo(
    () => computePeriodPay(logsByDate, employee, holidaySet, settings, shiftMarks),
    [logsByDate, employee, holidaySet, settings, shiftMarks]
  );

  const manualTotalMinutes = manualHours * 60 + manualMinutes;
  const manualPay = useMemo(
    () =>
      computeManualPay(
        manualTotalMinutes,
        manualKind,
        settings,
        manualShiftKind,
        manualShiftDays
      ),
    [manualTotalMinutes, manualKind, settings, manualShiftKind, manualShiftDays]
  );

  const configured =
    hourlyRate > 0 || (flatShift && (settings.shiftFlatRate > 0 || settings.shiftWeekendFlatRate > 0));

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-3 sm:p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">Calculadora de pagamento</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {flatShift ? (
                <>
                  Plantão {formatBRL(settings.shiftFlatRate)}/dia · Dom {formatBRL(settings.shiftWeekendFlatRate)}
                  {' · '}sábado com ponto = H.E. + plantão
                </>
              ) : (
                'Estimativa de hora extra e plantão'
              )}
              {hourlyRate > 0 && <> · hora {formatBRL(hourlyRate)}</>}
            </p>
          </div>
        </div>

        <div className="flex p-0.5 bg-slate-100 dark:bg-slate-900/60 rounded-lg self-start sm:self-auto">
          <ModeBtn active={mode === 'period'} onClick={() => setMode('period')}>
            Período
          </ModeBtn>
          <ModeBtn active={mode === 'manual'} onClick={() => setMode('manual')}>
            Manual
          </ModeBtn>
        </div>
      </div>

      {!configured ? (
        <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-lg px-3 py-2">
          Configure salário ou plantão em <strong>Definições → Remuneração</strong>.
        </p>
      ) : null}

      {mode === 'period' ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <PayCard
            label="Banco / hora extra"
            sub={`${formatSigned(periodPay.overtimeMinutes)} (${periodPay.overtimeMinutes} min) ×${settings.overtimeMultiplier}`}
            amount={periodPay.overtimeAmount}
            accent="emerald"
            empty={periodPay.overtimeMinutes === 0}
          />
          <PayCard
            label="Plantão"
            sub={shiftPeriodSub(periodPay, settings)}
            amount={periodPay.shiftAmount}
            accent="indigo"
            empty={periodPay.shiftAmount === 0}
          />
          <PayCard
            label="Total estimado"
            sub="período filtrado"
            amount={periodPay.totalAmount}
            accent="brand"
            highlight
            empty={periodPay.totalAmount === 0}
          />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <KindBtn
              active={manualKind === 'overtime'}
              onClick={() => setManualKind('overtime')}
              label={`Hora extra (×${settings.overtimeMultiplier})`}
            />
            <KindBtn
              active={manualKind === 'shift'}
              onClick={() => setManualKind('shift')}
              label={flatShift ? 'Plantão (valor/dia)' : `Plantão (×${settings.shiftMultiplier})`}
            />
          </div>

          {manualKind === 'shift' && flatShift ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <KindBtn
                  active={manualShiftKind === 'weekday'}
                  onClick={() => setManualShiftKind('weekday')}
                  label={`Plantão ${formatBRL(settings.shiftFlatRate)}`}
                />
                <KindBtn
                  active={manualShiftKind === 'weekend'}
                  onClick={() => setManualShiftKind('weekend')}
                  label={`Sáb/Dom ${formatBRL(settings.shiftWeekendFlatRate)}`}
                />
                <KindBtn
                  active={manualShiftKind === 'holiday'}
                  onClick={() => setManualShiftKind('holiday')}
                  label={`Feriado ${formatBRL(settings.shiftFlatRate)}`}
                />
              </div>
              <label className="block space-y-0.5 sm:max-w-[8rem]">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Quantidade de dias
                </span>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={manualShiftDays}
                  onChange={(e) => setManualShiftDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="ponto-input"
                />
              </label>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:max-w-xs gap-2">
              <label className="block space-y-0.5">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Horas
                </span>
                <input
                  type="number"
                  min={0}
                  max={999}
                  value={manualHours || ''}
                  onChange={(e) => setManualHours(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="ponto-input"
                />
              </label>
              <label className="block space-y-0.5">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Minutos
                </span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={manualMinutes || ''}
                  onChange={(e) => setManualMinutes(Math.min(59, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                  className="ponto-input"
                />
              </label>
            </div>
          )}

          <div className="p-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide block">
                Valor estimado
              </span>
              <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {configured ? formatBRL(manualPay.amount) : '—'}
              </span>
            </div>
            {configured && manualPay.amount > 0 && (
              <span className="text-[11px] text-slate-500 dark:text-slate-400 text-right">{manualPay.label}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ModeBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 text-xs font-bold rounded-md transition ${
        active
          ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-white shadow-sm'
          : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

function KindBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition ${
        active
          ? 'bg-brand-50 dark:bg-brand-950/40 border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300'
          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-brand-200'
      }`}
    >
      {label}
    </button>
  );
}

function PayCard({
  label,
  sub,
  amount,
  accent,
  highlight,
  empty,
}: {
  label: string;
  sub: string;
  amount: number;
  accent: 'emerald' | 'indigo' | 'brand';
  highlight?: boolean;
  empty?: boolean;
}) {
  const borderCls = highlight
    ? 'border-brand-200 dark:border-brand-800 bg-brand-50/50 dark:bg-brand-950/20'
    : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40';

  const amountCls =
    accent === 'emerald'
      ? 'text-emerald-600 dark:text-emerald-400'
      : accent === 'indigo'
      ? 'text-indigo-600 dark:text-indigo-400'
      : 'text-brand-600 dark:text-brand-400';

  return (
    <div className={`p-2.5 rounded-lg border ${borderCls}`}>
      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block">
        {label}
      </span>
      <span className={`text-base font-bold font-mono block mt-0.5 ${amountCls}`}>
        {empty ? '—' : formatBRL(amount)}
      </span>
      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">{sub}</span>
    </div>
  );
}
