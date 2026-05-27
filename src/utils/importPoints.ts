import type { PointLog, PointType } from '../types';
import { getDayOfWeek } from './time';

export interface ParsedDay {
  date: string;
  dayOfWeek: number;
  rawTimes: string[];
  mapping: { type: PointType; time: string }[];
  warning?: string;
}

export interface ParseResult {
  days: ParsedDay[];
  logs: PointLog[];
  warnings: string[];
  detectedYear: number;
}

interface ParseOptions {
  employeeId: number;
  defaultYear?: number;
  noteTag?: string;
}

const TIME_RE = /\b([01]\d|2[0-3]):[0-5]\d\b/g;
const DATE_AT_START_RE = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?:\s|$)/;
const PERIOD_RANGE_RE =
  /Per[ií]odo[:\s]*(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s+a\s+(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/i;
const PERIOD_YEAR_RE = /Per[ií]odo[:\s]+\d{1,2}\/\d{1,2}\/(\d{2,4})/i;

/** Linhas de cabeçalho/rodapé do relatório — não são dias de ponto. */
const SKIP_LINE_RE =
  /^(?:folha|relat[oó]rio|colaborador|funcion[aá]rio|empresa|cargo|jornada|per[ií]odo|total|saldo|banco|trabalhad|observa|p[aá]gina|page|data\s*:|nome\s*:|matr[ií]cula|cpf|cnpj|assinatura|legenda|hor[aá]rio\s+esperado|intervalo)/i;

const POINT_4: PointType[] = ['Entrada', 'Saída Almoço', 'Retorno Almoço', 'Saída'];

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function normalizeYear(y: number): number {
  return y < 100 ? 2000 + y : y;
}

function timeToMins(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Relatórios costumam trazer colunas extra (ex.: 08:48 de jornada, 01:10 de almoço).
 * Mantém só horários de relógio plausíveis para marcações.
 */
function selectPunchTimes(all: string[]): string[] {
  if (all.length === 0) return [];

  const unique = [...new Set(all)];

  const filtered = unique.filter((t) => {
    const m = timeToMins(t);
    if (m === 0) return false;

    // Com 5+ horários na linha, descarta faixa típica de "total trabalhado" (07:xx–09:xx)
    if (unique.length >= 5 && m >= 420 && m <= 600) {
      const hasEarly = unique.some((o) => timeToMins(o) >= 240 && timeToMins(o) < 420);
      const hasLate = unique.some((o) => timeToMins(o) > 600 && timeToMins(o) <= 1200);
      if (hasEarly && hasLate) return false;
    }
    return true;
  });

  const pool = filtered.length > 0 ? filtered : unique;
  if (pool.length <= 4) return [...pool].sort((a, b) => timeToMins(a) - timeToMins(b));

  const sorted = [...pool].sort((a, b) => timeToMins(a) - timeToMins(b));

  for (let i = 0; i <= sorted.length - 4; i++) {
    const cand = sorted.slice(i, i + 4);
    if (isValidPunchSequence(cand)) return cand;
  }

  return sorted.slice(0, 4);
}

function isValidPunchSequence(times: string[]): boolean {
  if (times.length !== 4) return false;
  const m = times.map(timeToMins);
  for (let i = 1; i < m.length; i++) {
    if (m[i] <= m[i - 1]) return false;
  }
  if (m[0] < 240 || m[0] > 660) return false;
  if (m[3] < 720 || m[3] > 1260) return false;
  return true;
}

function mapTimesToPoints(times: string[], dow: number): { mapping: { type: PointType; time: string }[]; warning?: string } {
  if (times.length === 4) {
    return { mapping: POINT_4.map((type, i) => ({ type, time: times[i] })) };
  }
  if (times.length >= 5) {
    const picked = selectPunchTimes(times);
    return {
      mapping: POINT_4.map((type, i) => ({ type, time: picked[i] })),
      warning: `${times.length} horários na linha — usadas 4 marcações de ponto`,
    };
  }
  if (times.length === 3) {
    return {
      mapping: [
        { type: 'Entrada', time: times[0] },
        { type: 'Saída Almoço', time: times[1] },
        { type: 'Retorno Almoço', time: times[2] },
      ],
      warning: '3 marcações — sem saída final',
    };
  }
  if (times.length === 2) {
    if (dow === 0 || dow === 6) {
      return {
        mapping: [
          { type: 'Entrada', time: times[0] },
          { type: 'Saída', time: times[1] },
        ],
      };
    }
    return {
      mapping: [
        { type: 'Entrada', time: times[0] },
        { type: 'Saída Almoço', time: times[1] },
      ],
      warning: '2 marcações em dia útil — assumido manhã incompleta',
    };
  }
  if (times.length === 1) {
    return {
      mapping: [{ type: 'Entrada', time: times[0] }],
      warning: 'apenas 1 marcação',
    };
  }
  return { mapping: [] };
}

function detectYear(text: string, defaultYear: number): number {
  const range = text.match(PERIOD_RANGE_RE);
  if (range) {
    const y = range[3] ?? range[6];
    if (y) return normalizeYear(parseInt(y, 10));
  }
  const single = text.match(PERIOD_YEAR_RE);
  if (single) return normalizeYear(parseInt(single[1], 10));
  return defaultYear;
}

function shouldSkipLine(line: string): boolean {
  if (SKIP_LINE_RE.test(line)) return true;
  if (/^\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\s+a\s+\d{1,2}\/\d{1,2}/i.test(line)) return true;
  if (!DATE_AT_START_RE.test(line)) return true;
  return false;
}

/**
 * Faz parsing de texto solto (ex: copiado de um relatório de ponto)
 * e converte em logs estruturados.
 *
 * Formato esperado (cada linha):
 *   "DD/MM[/YYYY] [Dia da semana] HH:MM HH:MM HH:MM HH:MM"
 */
export function parsePointsText(text: string, opts: ParseOptions): ParseResult {
  const days: ParsedDay[] = [];
  const warnings: string[] = [];

  const detectedYear = detectYear(text, opts.defaultYear ?? new Date().getFullYear());
  const seen = new Set<string>();

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+/g, ' ').trim();
    if (!line || shouldSkipLine(line)) continue;

    const dateMatch = line.match(DATE_AT_START_RE);
    if (!dateMatch) continue;

    const dd = parseInt(dateMatch[1], 10);
    const mm = parseInt(dateMatch[2], 10);
    if (!dd || !mm || dd > 31 || mm > 12) continue;

    const yy = dateMatch[3] ? normalizeYear(parseInt(dateMatch[3], 10)) : detectedYear;
    const date = `${yy}-${pad(mm)}-${pad(dd)}`;

    if (seen.has(date)) continue;

    const rawTimes = [...line.matchAll(TIME_RE)].map((m) => m[0]);
    const times = selectPunchTimes(rawTimes);
    if (times.length === 0) continue;

    seen.add(date);

    const dow = getDayOfWeek(date);
    const { mapping, warning: mapWarning } = mapTimesToPoints(times, dow);
    if (mapping.length === 0) continue;

    let warning = mapWarning;
    if (rawTimes.length > times.length) {
      const extra = `${rawTimes.length} horários na linha — ignoradas colunas de total/jornada`;
      warning = warning ? `${extra}; ${warning}` : extra;
    }

    days.push({ date, dayOfWeek: dow, rawTimes: times, mapping, warning });
    if (warning) warnings.push(`${date}: ${warning}`);
  }

  days.sort((a, b) => a.date.localeCompare(b.date));

  const logs: PointLog[] = [];
  const note = opts.noteTag ?? 'Importado';
  for (const d of days) {
    for (const m of d.mapping) {
      logs.push({
        employeeId: opts.employeeId,
        date: d.date,
        type: m.type,
        time: m.time,
        note,
        photo: null,
      });
    }
  }

  return { days, logs, warnings, detectedYear };
}
