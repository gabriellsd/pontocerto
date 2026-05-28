import { useEffect, useMemo, useState } from 'react';
import { Calculator } from 'lucide-react';
import type { AppSettings, Employee, PointLog, ShiftMark } from '../../types';
import {
  computeManualPay,
  computeManualShiftFlatPay,
  computePeriodPay,
  formatBRL,
  resolveHourlyRate,
  shiftPlantaoRatesEqual,
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
  const sameRate = shiftPlantaoRatesEqual(settings);
  const regularDays = pay.shiftWeekdayDays + pay.shiftWeekendDays;
  if (sameRate) {
    if (regularDays > 0) {
      parts.push(`${regularDays}× plantão (sáb-dom) ${formatBRL(settings.shiftFlatRate)}`);
    }
  } else {
    if (pay.shiftWeekdayDays > 0) {
      parts.push(`${pay.shiftWeekdayDays}× plantão ${formatBRL(settings.shiftFlatRate)}`);
    }
    if (pay.shiftWeekendDays > 0) {
      parts.push(`${pay.shiftWeekendDays}× sáb/dom ${formatBRL(settings.shiftWeekendFlatRate)}`);
    }
  }
  if (pay.shiftHolidayDays > 0) {
    parts.push(`${pay.shiftHolidayDays}× feriado ${formatBRL(settings.shiftFlatRate)}`);
  }
  return parts.length ? parts.join(' · ') : '0 dias na escala';
}

export function PayCalculator({ settings, employee, logsByDate, shiftMarks, holidaySet }: PayCalculatorProps) {
  const [mode, setMode] = useState<Mode>('period');
  const [includeOvertime, setIncludeOvertime] = useState(true);
  const [includeShift, setIncludeShift] = useState(false);
  const [manualHours, setManualHours] = useState(0);
  const [manualMinutes, setManualMinutes] = useState(0);
  const [manualShiftRegular, setManualShiftRegular] = useState(0);
  const [manualShiftWeekday, setManualShiftWeekday] = useState(0);
  const [manualShiftWeekend, setManualShiftWeekend] = useState(0);
  const [manualShiftHoliday, setManualShiftHoliday] = useState(0);

  const flatShift = usesShiftFlatRate(settings);
  const samePlantaoRate = shiftPlantaoRatesEqual(settings);
  const hourlyRate = resolveHourlyRate(settings);
  const periodPay = useMemo(
    () => computePeriodPay(logsByDate, employee, holidaySet, settings, shiftMarks),
    [logsByDate, employee, holidaySet, settings, shiftMarks]
  );

  useEffect(() => {
    if (!includeOvertime) return;
    const m = Math.max(0, periodPay.overtimeMinutes);
    setManualHours(Math.floor(m / 60));
    setManualMinutes(m % 60);
  }, [includeOvertime]);

  useEffect(() => {
    if (!includeShift || !flatShift) return;
    if (samePlantaoRate) {
      setManualShiftRegular(periodPay.shiftWeekdayDays + periodPay.shiftWeekendDays);
    } else {
      setManualShiftWeekday(periodPay.shiftWeekdayDays);
      setManualShiftWeekend(periodPay.shiftWeekendDays);
    }
    setManualShiftHoliday(periodPay.shiftHolidayDays);
  }, [includeShift, flatShift, samePlantaoRate]);

  const manualTotalMinutes = manualHours * 60 + manualMinutes;
  const manualPay = useMemo(() => {
    const parts: { amount: number; label: string }[] = [];

    if (includeOvertime && manualTotalMinutes > 0) {
      const ot = computeManualPay(manualTotalMinutes, 'overtime', settings);
      if (ot.amount > 0) parts.push({ amount: ot.amount, label: ot.label });
    }

    if (includeShift) {
      if (flatShift) {
        const sh = computeManualShiftFlatPay(
          settings,
          samePlantaoRate ? manualShiftRegular : manualShiftWeekday,
          samePlantaoRate ? 0 : manualShiftWeekend,
          manualShiftHoliday
        );
        if (sh.amount > 0) parts.push({ amount: sh.amount, label: sh.label });
      } else if (manualTotalMinutes > 0) {
        const sh = computeManualPay(manualTotalMinutes, 'shift', settings);
        if (sh.amount > 0) parts.push({ amount: sh.amount, label: sh.label });
      }
    }

    const amount = parts.reduce((s, p) => s + p.amount, 0);
    const label = parts.map((p) => p.label).join(' + ') || 'Selecione um tipo e preencha os valores';
    return { amount, label, hourlyRate };
  }, [
    manualTotalMinutes,
    includeOvertime,
    includeShift,
    flatShift,
    samePlantaoRate,
    settings,
    hourlyRate,
    manualShiftRegular,
    manualShiftWeekday,
    manualShiftWeekend,
    manualShiftHoliday,
  ]);

  const configured =
    hourlyRate > 0 || (flatShift && (settings.shiftFlatRate > 0 || settings.shiftWeekendFlatRate > 0));

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-3 sm:p-4 space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">Calculadora de pagamento</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {flatShift ? (
                <>
                  {samePlantaoRate ? (
                    <>Plantão {formatBRL(settings.shiftFlatRate)}/dia (sáb-dom)</>
                  ) : (
                    <>
                      Plantão {formatBRL(settings.shiftFlatRate)}/dia · Dom{' '}
                      {formatBRL(settings.shiftWeekendFlatRate)}
                    </>
                  )}
                  {' · '}sábado com ponto = H.E. + plantão
                </>
              ) : (
                'Estimativa de hora extra e plantão'
              )}
              {hourlyRate > 0 && <> · hora {formatBRL(hourlyRate)}</>}
            </p>
          </div>
        </div>

        <div className="flex p-0.5 bg-slate-100 dark:bg-slate-900/60 rounded-lg self-start lg:self-auto">
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
          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
            Ative um ou os dois tipos — o total soma hora extra e plantão juntos.
          </p>
          <div className="flex flex-wrap gap-2">
            <KindBtn
              active={includeOvertime}
              onClick={() => setIncludeOvertime((v) => !v)}
              label={`Hora extra (×${settings.overtimeMultiplier})`}
            />
            <KindBtn
              active={includeShift}
              onClick={() => setIncludeShift((v) => !v)}
              label={flatShift ? 'Plantão (valor/dia)' : `Plantão (×${settings.shiftMultiplier})`}
            />
          </div>

          {includeOvertime || (includeShift && !flatShift) ? (
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {includeOvertime && includeShift && !flatShift
                  ? 'Horas (hora extra e plantão)'
                  : includeOvertime
                  ? 'Hora extra — tempo'
                  : 'Plantão — tempo'}
              </span>
              <div className="grid grid-cols-2 sm:max-w-xs gap-2">
                <label className="block space-y-0.5">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Horas</span>
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
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Minutos</span>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={manualMinutes || ''}
                    onChange={(e) =>
                      setManualMinutes(Math.min(59, Math.max(0, parseInt(e.target.value, 10) || 0)))
                    }
                    className="ponto-input"
                  />
                </label>
              </div>
            </div>
          ) : null}

          {includeShift && flatShift ? (
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Plantão — dias
              </span>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                {samePlantaoRate
                  ? 'Plantão de sábado e domingo usa o mesmo valor por dia; feriados em dia útil contam à parte.'
                  : 'Dia útil, fim de semana e feriado podem ter valores diferentes — como no modo Período.'}{' '}
                Ao ativar plantão, os dias do período filtrado são preenchidos automaticamente.
              </p>
              <div
                className={`grid grid-cols-1 gap-2 ${samePlantaoRate ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}
              >
                {samePlantaoRate ? (
                  <ShiftDayField
                    label="Plantão (sáb-dom)"
                    sub={formatBRL(settings.shiftFlatRate)}
                    value={manualShiftRegular}
                    onChange={setManualShiftRegular}
                  />
                ) : (
                  <>
                    <ShiftDayField
                      label="Plantão (dia útil)"
                      sub={formatBRL(settings.shiftFlatRate)}
                      value={manualShiftWeekday}
                      onChange={setManualShiftWeekday}
                    />
                    <ShiftDayField
                      label="Sábado / domingo"
                      sub={formatBRL(settings.shiftWeekendFlatRate)}
                      value={manualShiftWeekend}
                      onChange={setManualShiftWeekend}
                    />
                  </>
                )}
                <ShiftDayField
                  label="Feriado (dia útil)"
                  sub={formatBRL(settings.shiftFlatRate)}
                  value={manualShiftHoliday}
                  onChange={setManualShiftHoliday}
                />
              </div>
            </div>
          ) : null}

          {!includeOvertime && !includeShift ? (
            <p className="text-[10px] text-amber-700 dark:text-amber-400">
              Ative pelo menos hora extra ou plantão para calcular.
            </p>
          ) : null}

          <div className="p-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide block">
                Valor estimado
              </span>
              <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {configured ? formatBRL(manualPay.amount) : '—'}
              </span>
            </div>
            {configured && (manualPay.amount > 0 || includeOvertime || includeShift) && (
              <span className="text-[11px] text-slate-500 dark:text-slate-400 text-right max-w-[55%]">
                {manualPay.label}
              </span>
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

function ShiftDayField({
  label,
  sub,
  value,
  onChange,
}: {
  label: string;
  sub: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="block space-y-0.5 p-2 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block leading-tight">{label}</span>
      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{sub}/dia</span>
      <input
        type="number"
        min={0}
        max={31}
        value={value || ''}
        onChange={(e) => onChange(Math.max(0, parseInt(e.target.value, 10) || 0))}
        className="ponto-input mt-1"
      />
    </label>
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
