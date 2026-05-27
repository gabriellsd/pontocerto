import { useMemo, useState } from 'react';
import { Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Employee, PointLog } from '../../types';
import { computeWorkedMinutes, formatDateBR, formatHM, isNonWorkDay } from '../../utils/time';

interface YearHeatmapProps {
  employee: Employee;
  empLogs: PointLog[]; // logs já filtrados pelo employee
  holidaySet: Set<string>;
  initialYear?: number;
}

interface Cell {
  date: string;
  worked: number;
  expected: number;
  balance: number;
  weekday: number; // 0=Dom .. 6=Sáb
  monthIdx: number; // 0..11
  weekIdx: number; // coluna no grid
}

function buildCells(year: number, empLogs: PointLog[], employee: Employee, holidaySet: Set<string>): { cells: Cell[]; columns: number; monthLabels: { col: number; label: string }[] } {
  const logsByDate = new Map<string, PointLog[]>();
  for (const l of empLogs) {
    if (!l.date.startsWith(`${year}-`)) continue;
    const arr = logsByDate.get(l.date);
    if (arr) arr.push(l);
    else logsByDate.set(l.date, [l]);
  }

  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  const cells: Cell[] = [];
  const monthLabels: { col: number; label: string }[] = [];
  const monthShort = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  // Coluna do início: o primeiro dia do ano pode ser qualquer dia da semana.
  // O nosso grid começa em Domingo na linha 0 → ajustamos o weekday em -dia.
  // Cada "coluna" representa uma semana.
  let col = 0;
  let lastMonth = -1;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dow = d.getDay(); // 0 Dom
    if (dow === 0 && cells.length > 0) col += 1;

    const logs = logsByDate.get(iso) ?? [];
    const worked = logs.length ? computeWorkedMinutes(logs, false) : 0;
    const expected = isNonWorkDay(iso, employee.weekdaysOnly, holidaySet) ? 0 : employee.dailyMinutes;
    const balance = worked > 0 ? worked - expected : 0;

    cells.push({
      date: iso,
      worked,
      expected,
      balance,
      weekday: dow,
      monthIdx: d.getMonth(),
      weekIdx: col,
    });

    if (d.getMonth() !== lastMonth) {
      // marcador do mês na coluna atual (apenas se houver espaço)
      const prevLabel = monthLabels[monthLabels.length - 1];
      if (!prevLabel || col - prevLabel.col >= 3) {
        monthLabels.push({ col, label: monthShort[d.getMonth()] });
      }
      lastMonth = d.getMonth();
    }
  }

  return { cells, columns: col + 1, monthLabels };
}

function cellColor(cell: Cell): string {
  if (cell.worked === 0) return 'rgb(226, 232, 240)'; // slate-200
  if (cell.balance > 0) {
    // verde mais intenso conforme mais hora extra
    const intensity = Math.min(1, cell.balance / 120);
    const g = Math.round(160 + 65 * intensity);
    return `rgb(34, ${g}, 94)`;
  }
  if (cell.balance < 0) {
    const intensity = Math.min(1, Math.abs(cell.balance) / 120);
    const r = Math.round(220 + 35 * intensity);
    return `rgb(${r}, 68, 68)`;
  }
  return 'rgb(56, 189, 248)'; // sky-400 (atingiu certo)
}

function cellColorDark(cell: Cell): string {
  if (cell.worked === 0) return 'rgb(30, 41, 59)'; // slate-800
  if (cell.balance > 0) {
    const intensity = Math.min(1, cell.balance / 120);
    return `rgba(16, 185, 129, ${0.4 + 0.5 * intensity})`;
  }
  if (cell.balance < 0) {
    const intensity = Math.min(1, Math.abs(cell.balance) / 120);
    return `rgba(239, 68, 68, ${0.45 + 0.5 * intensity})`;
  }
  return 'rgba(56, 189, 248, 0.6)';
}

export function YearHeatmap({ employee, empLogs, holidaySet, initialYear }: YearHeatmapProps) {
  const [year, setYear] = useState(() => initialYear ?? new Date().getFullYear());
  const data = useMemo(
    () => buildCells(year, empLogs, employee, holidaySet),
    [year, empLogs, employee, holidaySet]
  );

  const totals = useMemo(() => {
    let worked = 0;
    let expected = 0;
    let balance = 0;
    let days = 0;
    for (const c of data.cells) {
      if (c.worked > 0) {
        worked += c.worked;
        expected += c.expected;
        balance += c.balance;
        days += 1;
      }
    }
    return { worked, expected, balance, days };
  }, [data]);

  const cellSize = 11;
  const gap = 2;
  const padTop = 18;
  const padLeft = 26;
  const gridW = data.columns * (cellSize + gap);
  const gridH = 7 * (cellSize + gap);
  const width = padLeft + gridW + 4;
  const height = padTop + gridH + 4;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-3 sm:p-4 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400">
            <Activity className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-sm text-slate-800 dark:text-white">
            Visão anual
          </h3>
        </div>
        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900/40 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setYear((y) => y - 1)}
            className="p-1.5 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded transition"
            aria-label="Ano anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2 font-mono font-bold text-sm text-slate-800 dark:text-white">{year}</span>
          <button
            type="button"
            onClick={() => setYear((y) => y + 1)}
            className="p-1.5 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded transition"
            aria-label="Próximo ano"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
        <Stat label="Dias trabalhados" value={String(totals.days)} />
        <Stat label="Total" value={formatHM(totals.worked)} />
        <Stat label="Esperado" value={formatHM(totals.expected)} />
        <Stat
          label="Saldo"
          value={`${totals.balance >= 0 ? '+' : '−'}${formatHM(Math.abs(totals.balance))}`}
          tone={totals.balance > 0 ? 'green' : totals.balance < 0 ? 'red' : 'gray'}
        />
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
          style={{ minWidth: width }}
        >
          {/* Labels dos dias */}
          {['Seg', 'Qua', 'Sex'].map((label, i) => {
            const dayIdx = i === 0 ? 1 : i === 1 ? 3 : 5;
            const y = padTop + dayIdx * (cellSize + gap) + cellSize - 1;
            return (
              <text key={label} x={2} y={y} fontSize="8" className="fill-slate-400 dark:fill-slate-500">
                {label}
              </text>
            );
          })}

          {/* Labels dos meses */}
          {data.monthLabels.map((m) => (
            <text
              key={m.col + m.label}
              x={padLeft + m.col * (cellSize + gap)}
              y={padTop - 4}
              fontSize="8"
              className="fill-slate-400 dark:fill-slate-500"
            >
              {m.label}
            </text>
          ))}

          {/* Células */}
          {data.cells.map((cell) => {
            const x = padLeft + cell.weekIdx * (cellSize + gap);
            const y = padTop + cell.weekday * (cellSize + gap);
            const light = cellColor(cell);
            const dark = cellColorDark(cell);
            return (
              <g key={cell.date}>
                <rect
                  x={x}
                  y={y}
                  width={cellSize}
                  height={cellSize}
                  rx={2}
                  fill={light}
                  className="dark:fill-[var(--dark-fill)]"
                  style={{ ['--dark-fill' as never]: dark }}
                >
                  <title>
                    {`${formatDateBR(cell.date)} — ${
                      cell.worked > 0
                        ? `${formatHM(cell.worked)} (saldo ${cell.balance >= 0 ? '+' : '−'}${formatHM(Math.abs(cell.balance))})`
                        : 'sem registo'
                    }`}
                  </title>
                </rect>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
        <span>Menos</span>
        <span className="w-3 h-3 rounded-sm" style={{ background: 'rgb(239, 68, 68)' }} />
        <span className="w-3 h-3 rounded-sm" style={{ background: 'rgb(226, 232, 240)' }} />
        <span className="w-3 h-3 rounded-sm" style={{ background: 'rgb(56, 189, 248)' }} />
        <span className="w-3 h-3 rounded-sm" style={{ background: 'rgb(34, 197, 94)' }} />
        <span className="w-3 h-3 rounded-sm" style={{ background: 'rgb(22, 163, 74)' }} />
        <span>Mais hora extra</span>
      </div>
    </div>
  );
}

function Stat({ label, value, tone = 'gray' }: { label: string; value: string; tone?: 'gray' | 'green' | 'red' }) {
  const valueCls =
    tone === 'green'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'red'
      ? 'text-red-600 dark:text-red-400'
      : 'text-slate-700 dark:text-slate-200';
  return (
    <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-100 dark:border-slate-800">
      <span className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`block font-mono font-bold ${valueCls}`}>{value}</span>
    </div>
  );
}
