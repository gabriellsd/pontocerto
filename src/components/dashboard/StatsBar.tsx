import { useMemo } from 'react';
import { Briefcase, Scale, Wallet } from 'lucide-react';
import type { Employee, Holiday, PointLog, ShiftMark } from '../../types';
import { computeWorkedMinutes, formatDateBR, formatHM, isNonWorkDay } from '../../utils/time';

interface StatsBarProps {
  employee: Employee;
  selectedDate: string;
  todayStr: string;
  dayLogs: PointLog[];
  allLogs: PointLog[];
  holidays: Holiday[];
  shiftMark?: ShiftMark;
}

export function StatsBar({
  employee,
  selectedDate,
  todayStr,
  dayLogs,
  allLogs,
  holidays,
  shiftMark,
}: StatsBarProps) {
  const holidaySet = useMemo(() => new Set(holidays.map((h) => h.date)), [holidays]);
  const isToday = selectedDate === todayStr;
  const workedDay = computeWorkedMinutes(dayLogs, isToday);
  const expectedDay = isNonWorkDay(selectedDate, employee.weekdaysOnly, holidaySet)
    ? 0
    : employee.dailyMinutes;

  // Saldo do dia: só faz sentido se houve trabalho ou se é dia útil que já passou.
  // Para um plantão (sábado/feriado) o saldo = todas as horas trabalhadas (expected = 0).
  const balanceDay = workedDay - (workedDay > 0 ? expectedDay : 0);

  // Banco de Horas: soma de todos os saldos diários do utilizador, em todos os meses.
  const bankOfHours = useMemo(() => {
    const empLogs = allLogs.filter((l) => l.employeeId === employee.id);
    const byDate = new Map<string, PointLog[]>();
    for (const log of empLogs) {
      const arr = byDate.get(log.date);
      if (arr) arr.push(log);
      else byDate.set(log.date, [log]);
    }
    let total = 0;
    for (const [date, logs] of byDate) {
      const w = computeWorkedMinutes(logs, date === todayStr);
      if (w === 0) continue;
      const exp = isNonWorkDay(date, employee.weekdaysOnly, holidaySet)
        ? 0
        : employee.dailyMinutes;
      total += w - exp;
    }
    return total;
  }, [allLogs, employee.id, employee.weekdaysOnly, employee.dailyMinutes, holidaySet, todayStr]);

  return (
    <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
      <StatCard
        icon={<Briefcase className="w-4 h-4" />}
        iconCls={
          shiftMark
            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
            : 'bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400'
        }
        label={shiftMark ? 'Plantão' : 'Trabalhadas'}
        fullLabel={shiftMark ? 'Plantão + horas' : 'Horas Trabalhadas'}
        value={formatHM(workedDay)}
        tooltip={
          shiftMark
            ? `Plantão anotado${shiftMark.note ? `: ${shiftMark.note}` : ''} · ${formatHM(workedDay)} trabalhadas`
            : `Trabalhado em ${formatDateBR(selectedDate)}`
        }
      />
      <StatCard
        icon={<Scale className="w-4 h-4" />}
        iconCls={iconBgFor(balanceDay)}
        label="Saldo Dia"
        fullLabel="Saldo do Dia"
        value={signed(balanceDay)}
        valueCls={balanceCls(balanceDay)}
        tooltip={`Esperado: ${formatHM(expectedDay)} · Trabalhado: ${formatHM(workedDay)}`}
      />
      <StatCard
        icon={<Wallet className="w-4 h-4" />}
        iconCls={iconBgFor(bankOfHours)}
        label="Banco"
        fullLabel="Banco de Horas"
        value={signed(bankOfHours)}
        valueCls={balanceCls(bankOfHours)}
        tooltip="Saldo acumulado de todos os dias registados"
      />
    </div>
  );
}

function iconBgFor(min: number): string {
  if (min === 0) return 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300';
  return min > 0
    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
    : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400';
}

function balanceCls(min: number): string {
  if (min === 0) return 'text-slate-600 dark:text-slate-300';
  return min > 0
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-red-600 dark:text-red-400';
}

function signed(min: number): string {
  if (min === 0) return formatHM(0);
  return `${min >= 0 ? '+' : '−'}${formatHM(Math.abs(min))}`;
}

interface StatCardProps {
  icon: React.ReactNode;
  iconCls: string;
  label: string;
  fullLabel: string;
  value: string;
  valueCls?: string;
  tooltip?: string;
}

function StatCard({ icon, iconCls, label, fullLabel, value, valueCls, tooltip }: StatCardProps) {
  return (
    <div
      title={tooltip}
      className="bg-white dark:bg-slate-800 px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-1.5 sm:gap-2 min-w-0"
    >
      <div className={`hidden sm:flex p-1.5 rounded-lg shrink-0 ${iconCls}`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <span className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 block font-medium leading-tight uppercase tracking-wide truncate">
          <span className="sm:hidden">{label}</span>
          <span className="hidden sm:inline">{fullLabel}</span>
        </span>
        <span
          className={`text-xs sm:text-base lg:text-lg font-bold font-mono leading-tight block truncate ${
            valueCls ?? 'text-slate-800 dark:text-white'
          }`}
        >
          {value}
        </span>
      </div>
    </div>
  );
}
