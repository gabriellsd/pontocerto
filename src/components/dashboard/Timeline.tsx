import { useMemo, useRef } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  Camera,
  Check,
  CircleDashed,
  MessageSquare,
  Play,
} from 'lucide-react';
import type { Employee, PointLog, PointType, ShiftMark } from '../../types';
import { Toast, type ToastData } from '../Toast';
import {
  diffInMinutes,
  formatHM,
  getCurrentTimeStr,
  minutesToTimeStr,
  timeStrToMinutes,
  WORK_LIMITS,
} from '../../utils/time';

interface TimelineProps {
  employee: Employee;
  shiftMark?: ShiftMark;
  logs: PointLog[];
  isToday: boolean;
  now: Date;
  note: string;
  onNoteChange: (n: string) => void;
  onRegister: (type: PointType) => void;
  onEditLog: (type: PointType) => void;
  onOpenPhoto: (log: PointLog) => void;
  toast: ToastData | null;
}

type Direction = 'in' | 'out';

const DIRECTION: Record<PointType, Direction> = {
  Entrada: 'in',
  'Saída Almoço': 'out',
  'Retorno Almoço': 'in',
  Saída: 'out',
};

const STEP_LABEL: Record<PointType, string> = {
  Entrada: 'Entrada',
  'Saída Almoço': 'Saída Almoço',
  'Retorno Almoço': 'Volta Almoço',
  Saída: 'Saída',
};

const STEPS: PointType[] = ['Entrada', 'Saída Almoço', 'Retorno Almoço', 'Saída'];

type StepState = 'filled' | 'next' | 'future';

interface StepInfo {
  type: PointType;
  state: StepState;
  log: PointLog | null;
  warning: boolean;
  suggested: string | null;
}

/** Horários efectivos: marcação real se existir, senão projeção pela jornada configurada. */
function resolveProjectedTimes(logs: PointLog[], employee: Employee) {
  const morningTarget = Math.min(
    Math.floor(employee.dailyMinutes / 2),
    WORK_LIMITS.maxMorningMinutes
  );

  const ent = logs.find((l) => l.type === 'Entrada')?.time ?? employee.startTime;
  const alS =
    logs.find((l) => l.type === 'Saída Almoço')?.time ??
    minutesToTimeStr(timeStrToMinutes(ent) + morningTarget);
  const alR =
    logs.find((l) => l.type === 'Retorno Almoço')?.time ??
    minutesToTimeStr(timeStrToMinutes(alS) + employee.lunchMinutes);
  const morningWorked = Math.max(0, diffInMinutes(ent, alS));
  const afternoonNeeded = Math.max(0, employee.dailyMinutes - morningWorked);
  const sai =
    logs.find((l) => l.type === 'Saída')?.time ??
    minutesToTimeStr(timeStrToMinutes(alR) + afternoonNeeded);

  return { ent, alS, alR, sai };
}

/**
 * Previsão de horário para cada tipo de marcação (mesmo os que ainda não são o "próximo").
 * Usa logs reais quando existem e encadeia o resto com base na jornada do colaborador.
 */
function suggestTimeForStep(
  type: PointType,
  logs: PointLog[],
  employee: Employee
): string | null {
  const t = resolveProjectedTimes(logs, employee);
  switch (type) {
    case 'Entrada':
      return t.ent || null;
    case 'Saída Almoço':
      return t.alS;
    case 'Retorno Almoço':
      return t.alR;
    case 'Saída':
      return t.sai || employee.endTime || null;
    default:
      return null;
  }
}

function segmentLabel(prev: PointLog, curr: PointLog): string | null {
  const mins = diffInMinutes(prev.time, curr.time);
  if (mins <= 0) return null;
  const fromIn = DIRECTION[prev.type] === 'in';
  const toOut = DIRECTION[curr.type] === 'out';
  const fromOut = DIRECTION[prev.type] === 'out';
  const toIn = DIRECTION[curr.type] === 'in';
  if (fromIn && toOut) return `Turno de ${formatHM(mins)}`;
  if (fromOut && toIn) return `Intervalo de ${formatHM(mins)}`;
  return formatHM(mins);
}

function getOutOfOrderTypes(dayLogs: PointLog[]): Set<PointType> {
  const out = new Set<PointType>();
  const ent = dayLogs.find((l) => l.type === 'Entrada');
  const alS = dayLogs.find((l) => l.type === 'Saída Almoço');
  const alR = dayLogs.find((l) => l.type === 'Retorno Almoço');
  const sai = dayLogs.find((l) => l.type === 'Saída');
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  if (ent && alS && toMin(alS.time) < toMin(ent.time)) out.add('Saída Almoço');
  if (alS && alR && toMin(alR.time) < toMin(alS.time)) out.add('Retorno Almoço');
  if (alR && sai && toMin(sai.time) < toMin(alR.time)) out.add('Saída');
  if (ent && sai && toMin(sai.time) < toMin(ent.time)) out.add('Saída');
  return out;
}

export function Timeline({
  employee,
  shiftMark,
  logs,
  isToday,
  now,
  note,
  onNoteChange,
  onRegister,
  onEditLog,
  onOpenPhoto,
  toast,
}: TimelineProps) {
  const warnSet = useMemo(() => getOutOfOrderTypes(logs), [logs]);

  // Manhã contínua excede o limite de 5h:
  // - Caso filled (S.Almoço marcada): diferença real S.Almoço - Entrada
  // - Caso live (S.Almoço ainda não marcada e é hoje): agora - Entrada
  const morningExceeded = useMemo(() => {
    const ent = logs.find((l) => l.type === 'Entrada')?.time;
    if (!ent) return null;
    const alS = logs.find((l) => l.type === 'Saída Almoço')?.time;
    if (alS) {
      const mins = diffInMinutes(ent, alS);
      return mins > WORK_LIMITS.maxMorningMinutes ? { mins, live: false } : null;
    }
    if (!isToday) return null;
    const mins = diffInMinutes(ent, getCurrentTimeStr(now));
    return mins > WORK_LIMITS.maxMorningMinutes ? { mins, live: true } : null;
  }, [logs, isToday, now]);

  const steps = useMemo<StepInfo[]>(() => {
    const byType = new Map(logs.map((l) => [l.type, l]));
    const nextType = STEPS.find((t) => !byType.has(t)) ?? null;
    return STEPS.map((type) => {
      const log = byType.get(type) ?? null;
      const state: StepState = log ? 'filled' : type === nextType ? 'next' : 'future';
      // Marca também o slot S.Almoço como warning quando ultrapassou o limite (manhã longa).
      const isOutOfOrder = warnSet.has(type);
      const isMorningOverflow =
        morningExceeded !== null && type === 'Saída Almoço';
      const suggested = !log ? suggestTimeForStep(type, logs, employee) : null;
      return { type, state, log, warning: isOutOfOrder || isMorningOverflow, suggested };
    });
  }, [logs, isToday, warnSet, morningExceeded, employee]);

  const warnings = useMemo(() => {
    const out: string[] = [];
    const ent = logs.find((l) => l.type === 'Entrada')?.time;
    const alS = logs.find((l) => l.type === 'Saída Almoço')?.time;
    const alR = logs.find((l) => l.type === 'Retorno Almoço')?.time;
    const sai = logs.find((l) => l.type === 'Saída')?.time;
    if (ent && alS && alS < ent) out.push(`Saída Almoço (${alS}) é anterior à Entrada (${ent}).`);
    if (alS && alR && alR < alS) out.push(`Volta Almoço (${alR}) é anterior à Saída Almoço (${alS}).`);
    if (alR && sai && sai < alR) out.push(`Saída (${sai}) é anterior à Volta Almoço (${alR}).`);
    if (ent && sai && sai < ent) out.push(`Saída (${sai}) é anterior à Entrada (${ent}).`);
    if (morningExceeded) {
      const limitLabel = formatHM(WORK_LIMITS.maxMorningMinutes);
      out.push(
        morningExceeded.live
          ? `Já trabalhou ${formatHM(morningExceeded.mins)} sem ir almoçar (limite ${limitLabel}).`
          : `Manhã com ${formatHM(morningExceeded.mins)} contínuos — excede o limite de ${limitLabel} antes do almoço.`
      );
    }
    return out;
  }, [logs, morningExceeded]);

  const allEmpty = steps.every((s) => s.state !== 'filled');

  return (
    <div className="bg-white dark:bg-slate-800 px-2.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <h2 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide">
          {isToday ? 'Registo de Ponto' : 'Marcações do Dia'}
        </h2>
        {shiftMark && (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-[10px] font-bold text-indigo-700 dark:text-indigo-300"
            title={shiftMark.note || 'Plantão'}
          >
            <CalendarCheck className="w-3 h-3 shrink-0" />
            Plantão{shiftMark.note ? `: ${shiftMark.note}` : ''}
          </span>
        )}
      </div>

      {warnings.length > 0 && (
        <div className="flex items-start gap-2 px-3 py-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-lg text-[11px] text-red-800 dark:text-red-300">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong>Marcações inconsistentes:</strong>
            <ul className="list-disc list-inside mt-0.5 space-y-0.5">
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {!isToday && allEmpty && (
        <p className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-lg px-3 py-2">
          Dia sem registos. Use <strong>Hoje</strong> no calendário para marcar ao vivo, ou clique na
          Entrada para adicionar horários deste dia.
        </p>
      )}

      <div className="space-y-0 min-w-0">
          {steps.map((step, idx) => {
            const next = steps[idx + 1];
            const segment =
              step.state === 'filled' && next?.state === 'filled' && step.log && next.log
                ? segmentLabel(step.log, next.log)
                : null;
            const isLast = idx === steps.length - 1;
            const segmentMins =
              step.state === 'filled' && next?.state === 'filled' && step.log && next.log
                ? diffInMinutes(step.log.time, next.log.time)
                : 0;
            // Destacar este segment se for o turno da manhã (Entrada → S.Almoço) acima do limite.
            const segmentOverflow =
              step.type === 'Entrada' &&
              next?.type === 'Saída Almoço' &&
              segmentMins > WORK_LIMITS.maxMorningMinutes;

            return (
              <div key={step.type}>
                <StepRow
                  step={step}
                  isFirst={idx === 0}
                  isLast={isLast}
                  isToday={isToday}
                  onRegister={onRegister}
                  onEditLog={onEditLog}
                  onOpenPhoto={onOpenPhoto}
                />
                {segment && (
                  <div className="flex gap-2.5 items-center" aria-hidden>
                    <div className="w-9 flex justify-center">
                      <div className={`w-px h-3 ${segmentOverflow ? 'bg-red-300 dark:bg-red-800' : 'bg-emerald-300 dark:bg-emerald-700'}`} />
                    </div>
                    <div className={`text-[11px] py-0.5 ${segmentOverflow ? 'text-red-600 dark:text-red-400 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                      {segment}
                      {segmentOverflow && (
                        <span className="ml-1 text-[9px] font-bold uppercase">
                          · acima de {formatHM(WORK_LIMITS.maxMorningMinutes)}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </div>

      <Toast toast={toast} />

      {isToday && (
        <div className="flex items-center gap-2 pt-1">
          <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            id="point-note"
            type="text"
            maxLength={200}
            placeholder="Observação (opcional)"
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            className="flex-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
          />
        </div>
      )}
    </div>
  );
}

interface StepRowProps {
  step: StepInfo;
  isFirst: boolean;
  isLast: boolean;
  isToday: boolean;
  onRegister: (type: PointType) => void;
  onEditLog: (type: PointType) => void;
  onOpenPhoto: (log: PointLog) => void;
}

function StepRow({
  step,
  isFirst,
  isLast,
  isToday,
  onRegister,
  onEditLog,
  onOpenPhoto,
}: StepRowProps) {
  const { type, state, log, warning, suggested } = step;
  const isIn = DIRECTION[type] === 'in';
  const label = STEP_LABEL[type];

  const longPressTimer = useRef<number | null>(null);
  const startLongPress = () => {
    if (state === 'future' || (state === 'filled' && !isToday && !log)) return;
    longPressTimer.current = window.setTimeout(() => {
      onEditLog(type);
      longPressTimer.current = null;
    }, 500);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (state !== 'future') onEditLog(type);
  };

  // Cor do círculo e conector
  let circleCls = '';
  let arrowCls = '';
  let connectorTopCls = 'bg-slate-200 dark:bg-slate-700';
  let connectorBottomCls = 'bg-slate-200 dark:bg-slate-700';

  if (state === 'filled') {
    circleCls = isIn
      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500 text-emerald-600 dark:text-emerald-400'
      : 'bg-red-50 dark:bg-red-950/30 border-red-500 text-red-600 dark:text-red-400';
    arrowCls = '';
    connectorTopCls = isIn
      ? 'bg-emerald-300 dark:bg-emerald-700'
      : 'bg-red-300 dark:bg-red-700';
    connectorBottomCls = connectorTopCls;
  } else if (state === 'next') {
    circleCls =
      'bg-brand-50 dark:bg-brand-950/40 border-brand-500 text-brand-600 dark:text-brand-400 ring-2 ring-brand-400/40 ring-offset-2 ring-offset-white dark:ring-offset-slate-800';
    arrowCls = 'text-brand-600 dark:text-brand-400';
  } else {
    circleCls =
      'bg-slate-50 dark:bg-slate-900/40 border-dashed border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-600';
    arrowCls = 'text-slate-300 dark:text-slate-600';
  }

  return (
    <div className="flex gap-2 group min-w-0">
      <div className="flex flex-col items-center w-9 shrink-0">
        {!isFirst && <div className={`w-px h-1.5 ${connectorTopCls}`} aria-hidden />}
        <button
          type="button"
          onContextMenu={state !== 'future' ? handleContextMenu : undefined}
          onTouchStart={startLongPress}
          onTouchEnd={cancelLongPress}
          onTouchCancel={cancelLongPress}
          onTouchMove={cancelLongPress}
          onMouseDown={(e) => {
            if (e.button === 0) startLongPress();
          }}
          onMouseUp={cancelLongPress}
          onMouseLeave={cancelLongPress}
          onClick={() => {
            if (state === 'next') {
              if (isToday) onRegister(type);
              else onEditLog(type);
            } else if (state === 'filled') {
              onEditLog(type);
            }
          }}
          aria-label={`${label}${log ? ` às ${log.time}` : ''}`}
          title={
            state === 'filled'
              ? `${label} (clique para editar)`
              : state === 'next'
              ? isToday
                ? `Marcar ${label} agora`
                : `Adicionar ${label}`
              : `${label} (ainda por marcar)`
          }
          disabled={state === 'future'}
          className={`relative w-8 h-8 rounded-full grid place-items-center border-2 transition-all ${circleCls} ${
            state !== 'future' ? 'hover:scale-110 active:scale-95 cursor-pointer' : 'cursor-default'
          }`}
        >
          {state === 'future' ? (
            <CircleDashed className={`w-4 h-4 ${arrowCls}`} strokeWidth={2} />
          ) : state === 'next' ? (
            <Play className={`w-3 h-3 ${arrowCls} fill-current`} />
          ) : isIn ? (
            <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
          ) : (
            <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
          )}
          {warning && (
            <span className="absolute -top-1 -right-1 bg-amber-400 dark:bg-amber-500 text-white rounded-full p-0.5">
              <AlertTriangle className="w-2 h-2" strokeWidth={3} />
            </span>
          )}
        </button>
        {!isLast && <div className={`flex-1 w-px min-h-[0.5rem] ${connectorBottomCls}`} aria-hidden />}
      </div>

      <div className="flex-1 pt-0.5 pb-1 min-w-0 overflow-hidden">
        <div className="flex items-baseline gap-2 flex-wrap">
          {state === 'filled' && log ? (
            <span className="font-mono text-sm sm:text-base font-bold text-slate-800 dark:text-white">
              {log.time}
            </span>
          ) : suggested ? (
            <span
              className={`font-mono text-base font-bold ${
                state === 'next'
                  ? 'text-brand-400/70 dark:text-brand-500/60'
                  : 'text-slate-400/60 dark:text-slate-500/45'
              }`}
              title="Previsão com base na jornada configurada e nas marcações já feitas"
            >
              {suggested}
            </span>
          ) : (
            <span className="font-mono text-base font-bold text-slate-300 dark:text-slate-600">
              --:--
            </span>
          )}
          <span
            className={`text-[11px] sm:text-xs uppercase tracking-wide font-semibold ${
              state === 'future'
                ? 'text-slate-300 dark:text-slate-600'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {label}
          </span>
          {log?.note && (
            <span
              className="inline-flex items-center gap-1 text-[10px] text-brand-600 dark:text-brand-400"
              title={log.note}
            >
              <MessageSquare className="w-3 h-3" />
            </span>
          )}
          {log?.photo && (
            <button
              type="button"
              onClick={() => onOpenPhoto(log)}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-950/60 transition"
              aria-label="Ver foto de auditoria"
            >
              <Camera className="w-3 h-3" />
              Foto
            </button>
          )}
          {state === 'filled' && (
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 ml-auto">
              <Check className="w-3 h-3" strokeWidth={3} />
              Marcado
            </span>
          )}
          {state === 'next' && (
            <span className="ml-auto inline-flex flex-wrap items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => (isToday ? onRegister(type) : onEditLog(type))}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white text-[11px] font-bold rounded-md shadow-sm shadow-brand-500/20 transition active:scale-95"
              >
                <Play className="w-3 h-3 fill-current" />
                {isToday ? 'Marcar agora' : 'Adicionar'}
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
