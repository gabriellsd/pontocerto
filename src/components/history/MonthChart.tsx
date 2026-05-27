import { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import type { Employee, PayPeriodConfig, PointLog } from '../../types';
import {
  computeWorkedMinutes,
  eachDateInPayPeriod,
  formatDateBR,
  formatHM,
  isNonWorkDay,
  isWeekend,
  shiftDateStr,
} from '../../utils/time';

interface MonthChartProps {
  employee: Employee;
  monthKey: string; // YYYY-MM
  payPeriodConfig: PayPeriodConfig;
  logsByDate: Map<string, PointLog[]>;
  holidaySet: Set<string>;
  dateRange?: { start: string; end: string };
}

interface DayPoint {
  date: string;
  day: number;
  worked: number;
  expected: number;
  weekend: boolean;
  holiday: boolean;
}

function buildPoints(
  periodKey: string,
  config: PayPeriodConfig,
  logsByDate: Map<string, PointLog[]>,
  employee: Employee,
  holidaySet: Set<string>,
  dateRange?: { start: string; end: string }
): DayPoint[] {
  const out: DayPoint[] = [];
  const dates = dateRange
    ? (() => {
        const arr: string[] = [];
        let cur = dateRange.start;
        while (cur <= dateRange.end) {
          arr.push(cur);
          cur = shiftDateStr(cur, 1);
        }
        return arr;
      })()
    : eachDateInPayPeriod(periodKey, config);
  for (const isoDate of dates) {
    const day = parseInt(isoDate.split('-')[2], 10);
    const logs = logsByDate.get(isoDate) ?? [];
    const worked = logs.length ? computeWorkedMinutes(logs, false) : 0;
    const weekend = isWeekend(isoDate);
    const holiday = holidaySet.has(isoDate);
    const expected = isNonWorkDay(isoDate, employee.weekdaysOnly, holidaySet) ? 0 : employee.dailyMinutes;
    out.push({ date: isoDate, day, worked, expected, weekend, holiday });
  }
  return out;
}

export function MonthChart({ employee, monthKey, payPeriodConfig, logsByDate, holidaySet, dateRange }: MonthChartProps) {
  const points = useMemo(
    () => buildPoints(monthKey, payPeriodConfig, logsByDate, employee, holidaySet, dateRange),
    [monthKey, payPeriodConfig, logsByDate, employee, holidaySet, dateRange]
  );

  // Escala vertical: máximo entre o maior trabalhado e a jornada esperada * 1.2
  const maxWorked = Math.max(0, ...points.map((p) => p.worked));
  const maxScale = Math.max(employee.dailyMinutes * 1.2, maxWorked, 60);
  const hasAnyData = points.some((p) => p.worked > 0);

  const width = Math.max(640, points.length * 22);
  const height = 180;
  const padTop = 12;
  const padBottom = 22;
  const padLeft = 32;
  const padRight = 8;
  const innerH = height - padTop - padBottom;
  const innerW = width - padLeft - padRight;
  const colW = innerW / points.length;
  const barW = Math.max(6, colW - 4);

  // Linha guia da jornada esperada (ex: 8h48)
  const expectedY = padTop + innerH - (employee.dailyMinutes / maxScale) * innerH;

  const yAxisLabels = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    f,
    label: formatHM(maxScale * f),
    y: padTop + innerH - f * innerH,
  }));

  if (!hasAnyData) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-3 sm:p-4">
        <Header />
        <p className="text-sm text-slate-500 dark:text-slate-400 italic mt-3">
          Sem dados para gerar gráfico neste período.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-3 sm:p-4 space-y-2">
      <Header />
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          style={{ minWidth: width / 2 }}
          preserveAspectRatio="xMinYMid meet"
          className="text-slate-400 dark:text-slate-500"
        >
          {/* Grid e eixo Y */}
          {yAxisLabels.map((l) => (
            <g key={l.f}>
              <line
                x1={padLeft}
                x2={width - padRight}
                y1={l.y}
                y2={l.y}
                stroke="currentColor"
                strokeOpacity={l.f === 0 ? 0.4 : 0.15}
                strokeDasharray={l.f === 0 ? undefined : '2 3'}
              />
              <text
                x={padLeft - 4}
                y={l.y}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize="9"
                fill="currentColor"
              >
                {l.label}
              </text>
            </g>
          ))}

          {/* Linha da jornada esperada */}
          <line
            x1={padLeft}
            x2={width - padRight}
            y1={expectedY}
            y2={expectedY}
            stroke="rgb(56, 189, 248)"
            strokeOpacity={0.6}
            strokeDasharray="4 3"
            strokeWidth={1.2}
          />
          <text
            x={width - padRight}
            y={expectedY - 3}
            textAnchor="end"
            fontSize="9"
            fill="rgb(56, 189, 248)"
          >
            Jornada {formatHM(employee.dailyMinutes)}
          </text>

          {/* Barras */}
          {points.map((p, i) => {
            const x = padLeft + i * colW + (colW - barW) / 2;
            const h = (p.worked / maxScale) * innerH;
            const y = padTop + innerH - h;
            const fill = p.worked === 0
              ? 'rgb(203, 213, 225)'
              : p.holiday
              ? 'rgb(168, 85, 247)'
              : p.weekend && employee.weekdaysOnly
              ? 'rgb(99, 102, 241)'
              : p.worked >= p.expected && p.expected > 0
              ? 'rgb(16, 185, 129)'
              : p.worked < p.expected
              ? 'rgb(239, 68, 68)'
              : 'rgb(99, 102, 241)';

            return (
              <g key={p.date}>
                {p.worked > 0 && (
                  <rect
                    x={x}
                    y={y}
                    width={barW}
                    height={h}
                    fill={fill}
                    opacity={0.85}
                    rx={2}
                  >
                    <title>{`${formatDateBR(p.date)} — ${formatHM(p.worked)}${p.expected > 0 ? ` / ${formatHM(p.expected)}` : ''}`}</title>
                  </rect>
                )}
                <text
                  x={x + barW / 2}
                  y={height - padBottom + 12}
                  textAnchor="middle"
                  fontSize="8.5"
                  fill="currentColor"
                  fillOpacity={p.day % 5 === 0 || p.day === 1 ? 1 : 0.55}
                >
                  {p.day}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <Legend />
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center gap-2">
      <div className="p-1.5 rounded-lg bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400">
        <BarChart3 className="w-4 h-4" />
      </div>
      <h3 className="font-bold text-sm text-slate-800 dark:text-white">
        Horas trabalhadas por dia
      </h3>
    </div>
  );
}

function Legend() {
  const items = [
    { color: 'rgb(16, 185, 129)', label: 'Atingiu a jornada' },
    { color: 'rgb(239, 68, 68)', label: 'Abaixo do esperado' },
    { color: 'rgb(99, 102, 241)', label: 'Plantão (fim-de-semana)' },
    { color: 'rgb(168, 85, 247)', label: 'Feriado' },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-500 dark:text-slate-400">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}
