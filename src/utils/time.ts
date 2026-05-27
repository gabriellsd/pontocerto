import type { AppSettings, PayPeriodConfig, PointLog, PointType } from '../types';
import { defaultSettings } from '../data/defaults';
import { POINT_ORDER } from '../types';

const DAYS_OF_WEEK = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
] as const;

const DAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function getTodayStr(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function getCurrentTimeStr(date: Date = new Date()): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function diffInMinutes(start?: string | null, end?: string | null): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}

export function timeStrToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTimeStr(totalMinutes: number): string {
  const m = ((totalMinutes % 1440) + 1440) % 1440; // normaliza para [0, 1440)
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

export function formatHM(totalMinutes: number): string {
  const m = Math.max(0, Math.round(totalMinutes));
  return `${pad(Math.floor(m / 60))}h ${pad(m % 60)}m`;
}

export function formatHMColon(totalMinutes: number): string {
  const m = Math.max(0, Math.round(totalMinutes));
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

/** Saldo de banco com sinal (+ / −), alinhado ao rodapé do histórico. */
export function formatSigned(mins: number): string {
  if (mins === 0) return '00h 00m';
  const sign = mins > 0 ? '+' : '-';
  return `${sign}${formatHM(Math.abs(mins))}`;
}

function safeDiff(start?: string, end?: string): number {
  if (!start || !end) return 0;
  const m = diffInMinutes(start, end);
  return m < 0 ? 0 : m; // marcações fora de ordem → ignora a metade
}

/**
 * Calcula minutos trabalhados no dia, lidando com marcações parciais.
 * Retorna 0 nas porções onde a ordem das marcações é inválida (ex: R.Almoço < S.Almoço).
 *
 *   Entrada + S.Almoço + R.Almoço + Saída → soma das 2 metades
 *   Entrada + Saída (sem almoço)          → diferença direta (plantão / saiu cedo)
 *   Entrada + S.Almoço                    → só a manhã (a tarde fica em aberto)
 *   Entrada + S.Almoço + R.Almoço         → manhã + (allowOpen ? até agora : 0)
 *   Entrada apenas                        → allowOpen ? até agora : 0
 */
export function computeWorkedMinutes(dayLogs: PointLog[], allowOpen = false): number {
  const ent = dayLogs.find((l) => l.type === 'Entrada')?.time;
  const alS = dayLogs.find((l) => l.type === 'Saída Almoço')?.time;
  const alR = dayLogs.find((l) => l.type === 'Retorno Almoço')?.time;
  const sai = dayLogs.find((l) => l.type === 'Saída')?.time;
  if (!ent) return 0;

  let total = 0;

  if (alS) {
    total += safeDiff(ent, alS);
  } else if (sai) {
    return safeDiff(ent, sai);
  } else if (allowOpen) {
    return safeDiff(ent, getCurrentTimeStr());
  } else {
    return 0;
  }

  if (alR && sai) {
    total += safeDiff(alR, sai);
  } else if (alR && allowOpen) {
    total += safeDiff(alR, getCurrentTimeStr());
  }

  return total;
}

export interface DayValidation {
  ok: boolean;
  warnings: string[];
}

/**
 * Verifica se as marcações de um dia estão em ordem crescente.
 */
export function validateDayLogs(dayLogs: PointLog[]): DayValidation {
  const ent = dayLogs.find((l) => l.type === 'Entrada')?.time;
  const alS = dayLogs.find((l) => l.type === 'Saída Almoço')?.time;
  const alR = dayLogs.find((l) => l.type === 'Retorno Almoço')?.time;
  const sai = dayLogs.find((l) => l.type === 'Saída')?.time;
  const warnings: string[] = [];
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  if (ent && alS && toMin(alS) < toMin(ent)) {
    warnings.push(`Saída Almoço (${alS}) é anterior à Entrada (${ent}).`);
  }
  if (alS && alR && toMin(alR) < toMin(alS)) {
    warnings.push(`Volta Almoço (${alR}) é anterior à Saída Almoço (${alS}).`);
  }
  if (alR && sai && toMin(sai) < toMin(alR)) {
    warnings.push(`Saída (${sai}) é anterior à Volta Almoço (${alR}).`);
  }
  if (ent && sai && toMin(sai) < toMin(ent)) {
    warnings.push(`Saída (${sai}) é anterior à Entrada (${ent}).`);
  }
  return { ok: warnings.length === 0, warnings };
}

export interface OrderCheck {
  ok: boolean;
  reason?: string;
}

export function validateOrder(type: PointType, todayLogs: PointLog[]): OrderCheck {
  const existing = new Set(todayLogs.map((l) => l.type));
  const idx = POINT_ORDER.indexOf(type);
  if (idx === -1) return { ok: false, reason: 'Tipo de marcação inválido.' };
  if (existing.has(type)) return { ok: false, reason: `Já registou "${type}" hoje.` };
  for (let i = 0; i < idx; i++) {
    if (!existing.has(POINT_ORDER[i])) {
      return { ok: false, reason: `Antes de registar "${type}" precisa registar "${POINT_ORDER[i]}".` };
    }
  }
  return { ok: true };
}

export function formatTimeStr(date: Date = new Date()): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function clampPayPeriodDay(value: number): number {
  return Math.min(31, Math.max(1, Math.round(value)));
}

export function getPayPeriodConfig(
  settings?: Partial<Pick<AppSettings, 'payPeriodStartDay' | 'payPeriodEndDay'>>
): PayPeriodConfig {
  return {
    startDay: clampPayPeriodDay(settings?.payPeriodStartDay ?? defaultSettings.payPeriodStartDay),
    endDay: clampPayPeriodDay(settings?.payPeriodEndDay ?? defaultSettings.payPeriodEndDay),
  };
}

export function describePayPeriod(config: PayPeriodConfig): string {
  return `dia ${config.startDay} ao dia ${config.endDay}`;
}

/** Chave YYYY-MM = mês do dia de fecho do ciclo. */
export function payPeriodKeyFromIsoDate(isoDate: string, config: PayPeriodConfig): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  let year = y;
  let month = m;
  if (d >= config.startDay) {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return `${year}-${pad(month)}`;
}

export function payPeriodKeyFromDate(date: Date = new Date(), config: PayPeriodConfig): string {
  return payPeriodKeyFromIsoDate(getTodayStr(date), config);
}

export function getPayPeriodRange(periodKey: string, config: PayPeriodConfig): { start: string; end: string } {
  const [y, m] = periodKey.split('-').map(Number);
  const end = `${y}-${pad(m)}-${pad(config.endDay)}`;
  let startYear = y;
  let startMonth = m - 1;
  if (startMonth < 1) {
    startMonth = 12;
    startYear -= 1;
  }
  const start = `${startYear}-${pad(startMonth)}-${pad(config.startDay)}`;
  return { start, end };
}

export function isDateInPayPeriod(isoDate: string, periodKey: string, config: PayPeriodConfig): boolean {
  const { start, end } = getPayPeriodRange(periodKey, config);
  return isoDate >= start && isoDate <= end;
}

export function eachDateInPayPeriod(periodKey: string, config: PayPeriodConfig): string[] {
  const { start, end } = getPayPeriodRange(periodKey, config);
  const dates: string[] = [];
  let cur = start;
  while (cur <= end) {
    dates.push(cur);
    cur = shiftDateStr(cur, 1);
  }
  return dates;
}

export function formatPayPeriodKey(periodKey: string, config: PayPeriodConfig): string {
  const { start, end } = getPayPeriodRange(periodKey, config);
  return `${formatDateBR(start)} a ${formatDateBR(end)}`;
}

export function formatDateBR(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

export function getDayOfWeek(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

export function isWeekend(isoDate: string): boolean {
  const day = getDayOfWeek(isoDate);
  return day === 0 || day === 6;
}

/**
 * Limites operacionais. CLT (Brasil) exige intervalo após 6h contínuas;
 * adotamos 5h como limite "seguro" antes do almoço para alertar com antecedência.
 */
export const WORK_LIMITS = {
  /** Máximo de minutos contínuos da manhã (Entrada → Saída Almoço). */
  maxMorningMinutes: 300, // 5h
} as const;

/**
 * Devolve `true` se a data corresponde a um dos feriados configurados.
 * Aceita também um Set para chamadas em loop com O(1).
 */
export function isHoliday(isoDate: string, holidays: { date: string }[] | Set<string>): boolean {
  if (holidays instanceof Set) return holidays.has(isoDate);
  return holidays.some((h) => h.date === isoDate);
}

/**
 * Indica se o dia conta como "não-útil" para o cálculo da jornada esperada:
 * fim-de-semana (se o employee.weekdaysOnly) OU feriado configurado.
 */
export function isNonWorkDay(
  isoDate: string,
  weekdaysOnly: boolean,
  holidays: { date: string }[] | Set<string>
): boolean {
  if (weekdaysOnly && isWeekend(isoDate)) return true;
  return isHoliday(isoDate, holidays);
}

export function getDayLabel(isoDate: string): string {
  return DAYS_OF_WEEK[getDayOfWeek(isoDate)];
}

export function getDayLabelShort(isoDate: string): string {
  return DAYS_SHORT[getDayOfWeek(isoDate)];
}

/** Soma ou subtrai `days` a uma data YYYY-MM-DD e devolve no mesmo formato. */
export function shiftDateStr(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return getTodayStr(dt);
}
