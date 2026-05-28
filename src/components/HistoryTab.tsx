import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Download, FileText, Filter, Save, Upload } from 'lucide-react';
import type { AppSettings, Employee, Holiday, PayPeriodConfig, PointLog, ShiftMark } from '../types';
import { getShiftMark } from '../utils/shiftMarks';
import { computePeriodBankBalance, isSaturday } from '../utils/payCalculator';
import { PayCalculator } from './calculator/PayCalculator';
import {
  computeWorkedMinutes,
  describePayPeriod,
  formatDateBR,
  formatHM,
  formatSigned,
  formatPayPeriodKey,
  getDayLabel,
  getPayPeriodRange,
  isHoliday,
  isNonWorkDay,
  payPeriodKeyFromDate,
  payPeriodKeyFromIsoDate,
} from '../utils/time';
import { MonthChart } from './history/MonthChart';

function parseBrToIso(value: string): string | null {
  const m = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yy = Number(m[3]);
  if (!dd || !mm || mm > 12 || dd > 31) return null;
  const dt = new Date(yy, mm - 1, dd);
  if (dt.getFullYear() !== yy || dt.getMonth() !== mm - 1 || dt.getDate() !== dd) return null;
  return `${yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

interface HistoryTabProps {
  employee: Employee;
  allLogs: PointLog[];
  shiftMarks: ShiftMark[];
  holidays: Holiday[];
  settings: AppSettings;
  payPeriodConfig: PayPeriodConfig;
  monthKey: string;
  onMonthChange: (key: string) => void;
  onExportCSV: () => void;
  onExportPDF: () => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
}

export function HistoryTab({
  employee,
  allLogs,
  shiftMarks,
  holidays,
  settings,
  payPeriodConfig,
  monthKey,
  onMonthChange,
  onExportCSV,
  onExportPDF,
  onExportBackup,
  onImportBackup,
}: HistoryTabProps) {
  const [filterMode, setFilterMode] = useState<'competence' | 'custom'>('competence');
  const [dateSort, setDateSort] = useState<'desc' | 'asc'>('desc');
  const currentRange = useMemo(() => getPayPeriodRange(monthKey, payPeriodConfig), [monthKey, payPeriodConfig]);
  const [customStart, setCustomStart] = useState(currentRange.start);
  const [customEnd, setCustomEnd] = useState(currentRange.end);
  const [customStartText, setCustomStartText] = useState(formatDateBR(currentRange.start));
  const [customEndText, setCustomEndText] = useState(formatDateBR(currentRange.end));
  const startPickerRef = useRef<HTMLInputElement | null>(null);
  const endPickerRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setCustomStartText(formatDateBR(customStart));
  }, [customStart]);

  useEffect(() => {
    setCustomEndText(formatDateBR(customEnd));
  }, [customEnd]);

  // Garante ordem padrão: mais recente primeiro.
  useEffect(() => {
    setDateSort('desc');
  }, []);

  const holidaySet = useMemo(() => new Set(holidays.map((h) => h.date)), [holidays]);
  const holidayMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const h of holidays) map.set(h.date, h.label);
    return map;
  }, [holidays]);
  const empLogs = useMemo(
    () => allLogs.filter((l) => l.employeeId === employee.id),
    [allLogs, employee.id]
  );

  const empShiftMarks = useMemo(
    () => shiftMarks.filter((m) => m.employeeId === employee.id),
    [shiftMarks, employee.id]
  );

  const monthOptions = useMemo(() => {
    const set = new Set(empLogs.map((l) => payPeriodKeyFromIsoDate(l.date, payPeriodConfig)));
    for (const m of empShiftMarks) {
      set.add(payPeriodKeyFromIsoDate(m.date, payPeriodConfig));
    }
    set.add(payPeriodKeyFromDate(new Date(), payPeriodConfig));
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [empLogs, empShiftMarks, payPeriodConfig]);

  const activeRange = useMemo(() => {
    if (filterMode === 'competence') return currentRange;
    const start = customStart <= customEnd ? customStart : customEnd;
    const end = customStart <= customEnd ? customEnd : customStart;
    return { start, end };
  }, [filterMode, currentRange, customStart, customEnd]);

  const monthLogs = useMemo(
    () => empLogs.filter((l) => l.date >= activeRange.start && l.date <= activeRange.end),
    [empLogs, activeRange]
  );

  // Agrupa as marcações por dia uma única vez por mês, evitando filtrar repetidamente
  // dentro do loop de cálculo e dentro do JSX.
  const periodShiftMarks = useMemo(
    () => empShiftMarks.filter((m) => m.date >= activeRange.start && m.date <= activeRange.end),
    [empShiftMarks, activeRange]
  );

  const logsByDate = useMemo(() => {
    const map = new Map<string, PointLog[]>();
    for (const log of monthLogs) {
      const arr = map.get(log.date);
      if (arr) arr.push(log);
      else map.set(log.date, [log]);
    }
    return map;
  }, [monthLogs]);

  const uniqueDates = useMemo(() => {
    const set = new Set(logsByDate.keys());
    for (const m of periodShiftMarks) set.add(m.date);
    return [...set].sort((a, b) => (dateSort === 'desc' ? b.localeCompare(a) : a.localeCompare(b)));
  }, [logsByDate, periodShiftMarks, dateSort]);

  const monthTotals = useMemo(
    () => computePeriodBankBalance(logsByDate, employee, holidaySet),
    [logsByDate, employee, holidaySet]
  );

  return (
    <div className="space-y-4" role="tabpanel">
      <div className="bg-white dark:bg-slate-800 p-3 sm:p-5 lg:p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Folha de Ponto</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Período de competência: {describePayPeriod(payPeriodConfig)} · Exibindo: {formatDateBR(activeRange.start)} a {formatDateBR(activeRange.end)}
            </p>
          </div>
          <div className="w-full sm:w-auto">
            <div className="flex flex-nowrap sm:flex-wrap items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={onExportPDF}
              aria-label="Exportar folha de ponto em PDF"
              className="shrink-0 flex items-center justify-center space-x-2 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg transition shadow-sm"
            >
              <FileText className="w-4 h-4" />
              <span>Exportar PDF</span>
            </button>
            <button
              type="button"
              onClick={onExportCSV}
              aria-label="Exportar histórico em CSV"
              className="shrink-0 flex items-center justify-center space-x-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-white text-xs font-bold rounded-lg transition"
            >
              <Download className="w-4 h-4" />
              <span>Exportar CSV</span>
            </button>
            <button
              type="button"
              onClick={onExportBackup}
              aria-label="Exportar backup JSON"
              className="shrink-0 flex items-center justify-center space-x-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-white text-xs font-bold rounded-lg transition"
            >
              <Save className="w-4 h-4" />
              <span>Backup</span>
            </button>
            <label
              htmlFor="import-input"
              className="shrink-0 cursor-pointer flex items-center justify-center space-x-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-white text-xs font-bold rounded-lg transition"
            >
              <Upload className="w-4 h-4" />
              <span>Importar</span>
            </label>
            <input
              id="import-input"
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onImportBackup(file);
                e.target.value = '';
              }}
            />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl">
          <Filter className="w-5 h-5 text-slate-400" />
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Filtrar período:</span>
          <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <button
              type="button"
              onClick={() => setFilterMode('competence')}
              className={`px-2.5 py-1 text-xs font-bold transition ${
                filterMode === 'competence'
                  ? 'bg-brand-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              Competência
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('custom')}
              className={`px-2.5 py-1 text-xs font-bold transition border-l border-slate-200 dark:border-slate-700 ${
                filterMode === 'custom'
                  ? 'bg-brand-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              Período livre
            </button>
          </div>

          {filterMode === 'competence' ? (
            <select
              id="month-filter"
              value={monthKey}
              onChange={(e) => onMonthChange(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs rounded-lg px-2 py-1 focus:outline-none"
            >
              {monthOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {formatPayPeriodKey(opt, payPeriodConfig)}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-[11px] text-slate-500 dark:text-slate-400">Início</label>
              <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs rounded-lg px-2 py-1 gap-1">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="DD/MM/AAAA"
                  value={customStartText}
                  onChange={(e) => setCustomStartText(e.target.value)}
                  onBlur={() => {
                    const iso = parseBrToIso(customStartText);
                    if (iso) setCustomStart(iso);
                    else setCustomStartText(formatDateBR(customStart));
                  }}
                  className="bg-transparent focus:outline-none w-[92px]"
                />
                <button
                  type="button"
                  onClick={() => startPickerRef.current?.showPicker?.()}
                  className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  aria-label="Abrir calendário início"
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                </button>
                <input
                  ref={startPickerRef}
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden
                />
              </div>
              <label className="text-[11px] text-slate-500 dark:text-slate-400">Fim</label>
              <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs rounded-lg px-2 py-1 gap-1">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="DD/MM/AAAA"
                  value={customEndText}
                  onChange={(e) => setCustomEndText(e.target.value)}
                  onBlur={() => {
                    const iso = parseBrToIso(customEndText);
                    if (iso) setCustomEnd(iso);
                    else setCustomEndText(formatDateBR(customEnd));
                  }}
                  className="bg-transparent focus:outline-none w-[92px]"
                />
                <button
                  type="button"
                  onClick={() => endPickerRef.current?.showPicker?.()}
                  className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  aria-label="Abrir calendário fim"
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                </button>
                <input
                  ref={endPickerRef}
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden
                />
              </div>
            </div>
          )}
        </div>

        <PayCalculator
          settings={settings}
          employee={employee}
          logsByDate={logsByDate}
          shiftMarks={periodShiftMarks}
          holidaySet={holidaySet}
        />

        <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-700">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
                <th className="py-2 px-3">
                  <button
                    type="button"
                    onClick={() => setDateSort((s) => (s === 'desc' ? 'asc' : 'desc'))}
                    className="inline-flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 transition"
                    title={
                      dateSort === 'desc'
                        ? 'Ordenação atual: mais recente primeiro. Clique para mais antigo primeiro.'
                        : 'Ordenação atual: mais antigo primeiro. Clique para mais recente primeiro.'
                    }
                  >
                    Data / Dia
                    <span className="text-[9px]">{dateSort === 'desc' ? '↓' : '↑'}</span>
                  </button>
                </th>
                <th className="py-2 px-3">Entrada</th>
                <th className="py-2 px-3 hidden lg:table-cell">Início Almoço</th>
                <th className="py-2 px-3 hidden lg:table-cell">Fim Almoço</th>
                <th className="py-2 px-3">Saída</th>
                <th className="py-2 px-3">Total Horas</th>
                <th className="py-2 px-3">Banco de Horas</th>
                <th className="py-2 px-2 text-right w-24 hidden xl:table-cell">Notas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-[11px]">
              {uniqueDates.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-500 dark:text-slate-400 italic">
                    Nenhum registo neste período para o colaborador selecionado.
                  </td>
                </tr>
              ) : (
                uniqueDates.map((date) => {
                  const dayLogs = logsByDate.get(date) ?? [];
                  const shiftMark = getShiftMark(employee.id, date, shiftMarks);
                  const shiftOnly = Boolean(shiftMark) && dayLogs.length === 0;
                  const ent = dayLogs.find((l) => l.type === 'Entrada');
                  const almS = dayLogs.find((l) => l.type === 'Saída Almoço');
                  const almR = dayLogs.find((l) => l.type === 'Retorno Almoço');
                  const sai = dayLogs.find((l) => l.type === 'Saída');
                  const totalMins = computeWorkedMinutes(dayLogs, false);
                  const totalLabel = shiftOnly ? 'Plantão' : totalMins > 0 ? formatHM(totalMins) : '--:--';
                  const notes = [
                    shiftMark?.note,
                    ...dayLogs.map((l) => l.note).filter(Boolean),
                  ]
                    .filter(Boolean)
                    .join(' | ');
                  const holiday = isHoliday(date, holidaySet);
                  const nonWork = isNonWorkDay(date, employee.weekdaysOnly, holidaySet);
                  const saturdayPlantaoHe =
                    Boolean(shiftMark) &&
                    employee.weekdaysOnly &&
                    isSaturday(date) &&
                    totalMins > 0;
                  const expected = nonWork ? 0 : employee.dailyMinutes;
                  const balance = shiftOnly ? 0 : totalMins > 0 ? totalMins - expected : 0;
                  const hasBalance = !shiftOnly && totalMins > 0;
                  const isOvertime =
                    saturdayPlantaoHe ||
                    (totalMins > 0 && !shiftMark && (nonWork || totalMins > employee.dailyMinutes));
                  const balanceCls =
                    !hasBalance
                      ? 'text-slate-300 dark:text-slate-600'
                      : balance > 0
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                      : balance < 0
                      ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
                  const holidayLabel = holiday ? holidayMap.get(date) : undefined;

                  return (
                    <tr key={date} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                      <td className="py-2 px-3">
                        <div className="font-semibold text-slate-700 dark:text-slate-300">
                          {formatDateBR(date)}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span>{getDayLabel(date)}</span>
                          {holiday && (
                            <span
                              className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 rounded font-bold uppercase"
                              title={holidayLabel || 'Feriado'}
                            >
                              Feriado
                            </span>
                          )}
                          {shiftMark && (
                            <span className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 rounded font-bold uppercase">
                              {saturdayPlantaoHe ? 'Plantão + H.E.' : shiftOnly ? 'Plantão (marcado)' : 'Plantão'}
                            </span>
                          )}
                        </div>
                        {notes && (
                          <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 max-w-[12rem] truncate xl:hidden" title={notes}>
                            {notes}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono font-medium text-slate-600 dark:text-slate-400">
                        {ent ? ent.time : '--:--'}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-500 dark:text-slate-400 hidden lg:table-cell">
                        {almS ? almS.time : '--:--'}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-500 dark:text-slate-400 hidden lg:table-cell">
                        {almR ? almR.time : '--:--'}
                      </td>
                      <td className="py-2 px-3 font-mono font-medium text-slate-600 dark:text-slate-400">
                        {sai ? sai.time : '--:--'}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2.5 py-1 text-xs font-bold rounded-full font-mono ${
                            isOvertime
                              ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400'
                              : 'bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-400'
                          }`}
                        >
                          {totalLabel}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        {hasBalance ? (
                          <span
                            className={`px-2.5 py-1 text-xs font-bold rounded-full font-mono ${balanceCls}`}
                            title={
                              holiday
                                ? `Feriado${holidayLabel ? ' — ' + holidayLabel : ''} — todo o tempo conta como hora extra`
                                : nonWork
                                ? 'Plantão (fim-de-semana) — todo o tempo conta como hora extra'
                                : `Esperado: ${formatHM(expected)} · Trabalhado: ${formatHM(totalMins)}`
                            }
                          >
                            {formatSigned(balance)}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 font-mono">--</span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-right w-24 hidden xl:table-cell">
                        {notes ? (
                          <span
                            className="text-xs text-slate-500 max-w-[7rem] truncate block ml-auto"
                            title={notes}
                          >
                            {notes}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {uniqueDates.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 dark:bg-slate-900/50 border-t-2 border-slate-200 dark:border-slate-700 font-bold text-sm">
                  <td className="py-2 px-3 text-[11px] text-slate-500 dark:text-slate-400 uppercase">
                    Total do período
                  </td>
                  <td colSpan={4} className="py-2 px-3 text-xs text-slate-500 dark:text-slate-400 hidden lg:table-cell">
                    {uniqueDates.length} dia(s) trabalhado(s) · Esperado:{' '}
                    <span className="font-mono">{formatHM(monthTotals.expected)}</span>
                  </td>
                  <td colSpan={2} className="py-2 px-3 text-xs text-slate-500 dark:text-slate-400 lg:hidden">
                    {uniqueDates.length} dia(s) trabalhado(s) · Esperado:{' '}
                    <span className="font-mono">{formatHM(monthTotals.expected)}</span>
                  </td>
                  <td className="py-2 px-3">
                    <span className="px-2.5 py-1 text-xs font-bold rounded-full font-mono bg-brand-100 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400">
                      {formatHM(monthTotals.worked)}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className={`px-2.5 py-1 text-xs font-bold rounded-full font-mono ${
                        monthTotals.balance > 0
                          ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                          : monthTotals.balance < 0
                          ? 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {formatSigned(monthTotals.balance)}
                    </span>
                  </td>
                  <td className="py-2 px-2 w-24 hidden xl:table-cell" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <MonthChart
          employee={employee}
          monthKey={monthKey}
          payPeriodConfig={payPeriodConfig}
          logsByDate={logsByDate}
          holidaySet={holidaySet}
          dateRange={filterMode === 'custom' ? activeRange : undefined}
        />
      </div>
    </div>
  );
}
