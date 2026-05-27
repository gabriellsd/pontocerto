import type { AppSettings, Employee, PointLog, ShiftMark } from '../types';
import { hasShiftMark } from './shiftMarks';
import { computeWorkedMinutes, getDayOfWeek, isHoliday, isNonWorkDay, isWeekend } from './time';

export type PayKind = 'overtime' | 'shift';
export type ManualShiftKind = 'weekday' | 'weekend' | 'holiday';

export interface PeriodPaySummary {
  hourlyRate: number;
  /** Saldo líquido do banco no período (trabalhado − esperado), igual ao rodapé do histórico. */
  overtimeMinutes: number;
  shiftMinutes: number;
  shiftWeekdayDays: number;
  shiftWeekendDays: number;
  shiftHolidayDays: number;
  overtimeAmount: number;
  shiftAmount: number;
  totalAmount: number;
  shiftUsesFlatRate: boolean;
}

export function usesShiftFlatRate(settings: Pick<AppSettings, 'shiftFlatRate'>): boolean {
  return settings.shiftFlatRate > 0;
}

export function resolveHourlyRate(
  settings: Pick<AppSettings, 'payHourlyRate' | 'payMonthlySalary' | 'payMonthlyHours'>
): number {
  if (settings.payHourlyRate > 0) return settings.payHourlyRate;
  if (settings.payMonthlySalary > 0 && settings.payMonthlyHours > 0) {
    return settings.payMonthlySalary / settings.payMonthlyHours;
  }
  return 0;
}

export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function computePayAmount(minutes: number, hourlyRate: number, multiplier: number): number {
  if (minutes <= 0 || hourlyRate <= 0) return 0;
  return (minutes / 60) * hourlyRate * multiplier;
}

export function isWeekendDate(isoDate: string): boolean {
  const dow = getDayOfWeek(isoDate);
  return dow === 0 || dow === 6;
}

export function isSaturday(isoDate: string): boolean {
  return getDayOfWeek(isoDate) === 6;
}

/** Classifica minutos de hora extra e dias de plantão no período. */
export function classifyDayPay(
  date: string,
  dayLogs: PointLog[],
  employee: Employee,
  holidaySet: Set<string>,
  shiftMarks: ShiftMark[] = []
): { overtimeMinutes: number; shiftDay: boolean; shiftIsWeekend: boolean; shiftIsHoliday: boolean; workedMinutes: number } {
  const worked = computeWorkedMinutes(dayLogs, false);
  const marked = hasShiftMark(employee.id, date, shiftMarks);
  const onHoliday = isHoliday(date, holidaySet);
  const weekendWork = employee.weekdaysOnly && isWeekend(date) && worked > 0;

  // Sábado com ponto + plantão marcado: H.E. (horas) + valor fixo de plantão
  if (employee.weekdaysOnly && isSaturday(date) && worked > 0 && marked) {
    return {
      overtimeMinutes: worked,
      shiftDay: true,
      shiftIsWeekend: true,
      shiftIsHoliday: false,
      workedMinutes: worked,
    };
  }

  // Plantão só quando marcado explicitamente
  if (marked) {
    return {
      overtimeMinutes: 0,
      shiftDay: true,
      shiftIsWeekend: !onHoliday && isWeekendDate(date),
      shiftIsHoliday: onHoliday,
      workedMinutes: worked,
    };
  }

  // Fim de semana com horários, sem plantão: só hora extra
  if (weekendWork) {
    return {
      overtimeMinutes: worked,
      shiftDay: false,
      shiftIsWeekend: false,
      shiftIsHoliday: false,
      workedMinutes: worked,
    };
  }

  if (worked <= 0) {
    return { overtimeMinutes: 0, shiftDay: false, shiftIsWeekend: false, shiftIsHoliday: false, workedMinutes: 0 };
  }

  const balance = worked - employee.dailyMinutes;
  return {
    overtimeMinutes: Math.max(0, balance),
    shiftDay: false,
    shiftIsWeekend: false,
    shiftIsHoliday: false,
    workedMinutes: worked,
  };
}

/** Soma trabalhado, esperado e saldo do banco — mesma regra do rodapé da folha. */
export function computePeriodBankBalance(
  logsByDate: Map<string, PointLog[]>,
  employee: Pick<Employee, 'dailyMinutes' | 'weekdaysOnly'>,
  holidaySet: Set<string>
): { worked: number; expected: number; balance: number } {
  let worked = 0;
  let expected = 0;
  let balance = 0;
  for (const [date, dayLogs] of logsByDate) {
    const w = computeWorkedMinutes(dayLogs, false);
    if (w <= 0) continue;
    const exp = isNonWorkDay(date, employee.weekdaysOnly, holidaySet) ? 0 : employee.dailyMinutes;
    worked += w;
    expected += exp;
    balance += w - exp;
  }
  return { worked, expected, balance };
}

export function computeShiftFlatAmount(
  weekdayDays: number,
  weekendDays: number,
  holidayDays: number,
  settings: AppSettings
): number {
  if (settings.shiftFlatRate <= 0) return 0;
  const weekendRate =
    settings.shiftWeekendFlatRate > 0
      ? settings.shiftWeekendFlatRate
      : settings.shiftFlatRate * 2;
  // Feriado em dia útil: valor do plantão normal. Feriado no fim de semana já entra em weekendDays.
  return weekdayDays * settings.shiftFlatRate + weekendDays * weekendRate + holidayDays * settings.shiftFlatRate;
}

export function computePeriodPay(
  logsByDate: Map<string, PointLog[]>,
  employee: Employee,
  holidaySet: Set<string>,
  settings: AppSettings,
  shiftMarks: ShiftMark[] = []
): PeriodPaySummary {
  const hourlyRate = resolveHourlyRate(settings);
  const shiftUsesFlatRate = usesShiftFlatRate(settings);
  const { balance: bankBalance } = computePeriodBankBalance(logsByDate, employee, holidaySet);
  let shiftMinutes = 0;
  let shiftWeekdayDays = 0;
  let shiftWeekendDays = 0;
  let shiftHolidayDays = 0;

  for (const [date, dayLogs] of logsByDate) {
    const part = classifyDayPay(date, dayLogs, employee, holidaySet, shiftMarks);
    if (part.shiftDay) {
      shiftMinutes += part.workedMinutes;
      if (part.shiftIsHoliday && !part.shiftIsWeekend) {
        shiftHolidayDays += 1;
      } else if (part.shiftIsWeekend) {
        shiftWeekendDays += 1;
      } else {
        shiftWeekdayDays += 1;
      }
    }
  }

  // Dias só com marcação de plantão (sem horários no mapa de logs)
  for (const mark of shiftMarks) {
    if (mark.employeeId !== employee.id) continue;
    if (logsByDate.has(mark.date)) continue;
    const part = classifyDayPay(mark.date, [], employee, holidaySet, shiftMarks);
    if (!part.shiftDay) continue;
    if (part.shiftIsHoliday && !part.shiftIsWeekend) shiftHolidayDays += 1;
    else if (part.shiftIsWeekend) shiftWeekendDays += 1;
    else shiftWeekdayDays += 1;
  }

  const overtimeMinutes = bankBalance;
  const overtimeAmount = computePayAmount(
    Math.max(0, bankBalance),
    hourlyRate,
    settings.overtimeMultiplier
  );
  const shiftAmount = shiftUsesFlatRate
    ? computeShiftFlatAmount(shiftWeekdayDays, shiftWeekendDays, shiftHolidayDays, settings)
    : computePayAmount(shiftMinutes, hourlyRate, settings.shiftMultiplier);

  return {
    hourlyRate,
    overtimeMinutes,
    shiftMinutes,
    shiftWeekdayDays,
    shiftWeekendDays,
    shiftHolidayDays,
    overtimeAmount,
    shiftAmount,
    totalAmount: overtimeAmount + shiftAmount,
    shiftUsesFlatRate,
  };
}

export function computeManualPay(
  minutes: number,
  kind: PayKind,
  settings: AppSettings,
  shiftKind: ManualShiftKind = 'weekday',
  shiftDays = 1
): { hourlyRate: number; amount: number; multiplier: number; label: string } {
  const hourlyRate = resolveHourlyRate(settings);

  if (kind === 'shift' && usesShiftFlatRate(settings)) {
    const rate =
      shiftKind === 'weekend'
        ? settings.shiftWeekendFlatRate > 0
          ? settings.shiftWeekendFlatRate
          : settings.shiftFlatRate * 2
        : settings.shiftFlatRate;
    const days = Math.max(1, shiftDays);
    const kindLabel =
      shiftKind === 'holiday' ? 'feriado' : shiftKind === 'weekend' ? 'fim de semana' : 'plantão';
    return {
      hourlyRate,
      multiplier: 0,
      amount: rate * days,
      label: `${days} dia(s) ${kindLabel} × ${formatBRL(rate)}`,
    };
  }

  const multiplier = kind === 'overtime' ? settings.overtimeMultiplier : settings.shiftMultiplier;
  return {
    hourlyRate,
    multiplier,
    amount: computePayAmount(minutes, hourlyRate, multiplier),
    label: `${formatBRL(hourlyRate)} × ${multiplier}`,
  };
}
