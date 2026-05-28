import { useMemo } from 'react';
import type { Employee, PointLog } from '../../types';
import { computeWorkedMinutes, formatHM } from '../../utils/time';

interface LiveStatusProps {
  employee: Employee;
  dayLogs: PointLog[];
  now: Date;
  isToday: boolean;
}

type Phase = 'idle' | 'working' | 'lunch' | 'done';

interface LiveInfo {
  phase: Phase;
  remaining: number; // minutos que ainda faltam para fechar a jornada (>= 0)
  worked: number;
  expected: number;
}

function toMinutes(time?: string): number | null {
  if (!time) return null;
  const [h, m] = time.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function nowMinutes(now: Date): number {
  return now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
}

function diffPositive(start: number | null, end: number | null): number {
  if (start === null || end === null) return 0;
  return Math.max(0, end - start);
}

function computeWorkedMinutesLive(dayLogs: PointLog[], now: Date): number {
  const ent = toMinutes(dayLogs.find((l) => l.type === 'Entrada')?.time);
  const alS = toMinutes(dayLogs.find((l) => l.type === 'Saída Almoço')?.time);
  const alR = toMinutes(dayLogs.find((l) => l.type === 'Retorno Almoço')?.time);
  const sai = toMinutes(dayLogs.find((l) => l.type === 'Saída')?.time);
  if (ent === null) return 0;

  if (sai !== null) return computeWorkedMinutes(dayLogs, false);

  if (alS === null) return diffPositive(ent, nowMinutes(now));

  const morning = diffPositive(ent, alS);
  if (alR === null) return morning;
  return morning + diffPositive(alR, nowMinutes(now));
}

function computeLive(employee: Employee, dayLogs: PointLog[], now: Date): LiveInfo {
  const ent = dayLogs.find((l) => l.type === 'Entrada')?.time;
  const alS = dayLogs.find((l) => l.type === 'Saída Almoço')?.time;
  const alR = dayLogs.find((l) => l.type === 'Retorno Almoço')?.time;
  const sai = dayLogs.find((l) => l.type === 'Saída')?.time;
  const expected = employee.dailyMinutes;

  if (!ent) {
    return { phase: 'idle', remaining: expected, worked: 0, expected };
  }
  if (sai) {
    const worked = computeWorkedMinutes(dayLogs, false);
    return { phase: 'done', remaining: 0, worked, expected };
  }
  if (alS && !alR) {
    // em almoço — só conta a manhã como trabalhada
    const worked = computeWorkedMinutes(dayLogs, false);
    return { phase: 'lunch', remaining: Math.max(0, expected - worked), worked, expected };
  }
  const worked = computeWorkedMinutesLive(dayLogs, now);
  return { phase: 'working', remaining: Math.max(0, expected - worked), worked, expected };
}

export function LiveStatus({ employee, dayLogs, now, isToday }: LiveStatusProps) {
  // `now` é dep para forçar re-cálculo a cada segundo (computeWorkedMinutes(...,true)
  // usa internamente Date.now() para fechar o intervalo aberto até "agora").
  const info = useMemo(() => computeLive(employee, dayLogs, now), [employee, dayLogs, now]);
  if (!isToday) return null;

  const { phase, remaining, worked, expected } = info;
  const balance = worked - expected;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm px-3 py-2 sm:px-4 sm:py-2.5">
      <HourRuler
        worked={worked}
        expected={expected}
        phase={phase}
        balance={balance}
        remaining={remaining}
      />
    </div>
  );
}

interface HourRulerProps {
  worked: number;
  expected: number;
  phase: Phase;
  balance: number;
  remaining: number;
}

function HourRuler({ worked, expected, phase, balance, remaining }: HourRulerProps) {
  // Escala vai até max(worked, expected) arredondado para a próxima hora cheia
  const expectedHours = Math.max(1, Math.ceil(expected / 60));
  const workedHours = Math.ceil(worked / 60);
  const totalHours = Math.max(expectedHours, workedHours);
  const scale = totalHours * 60;
  const progress = Math.min(100, (worked / scale) * 100);
  const expectedPct = Math.min(100, (expected / scale) * 100);

  const ticks: number[] = [];
  for (let h = 1; h <= totalHours; h++) ticks.push(h);

  return (
    <div className="space-y-0.5">
      <div className="relative h-2 w-full bg-slate-100 dark:bg-slate-900/60 rounded-full overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all ${
            worked >= expected
              ? 'bg-emerald-500'
              : 'bg-gradient-to-r from-brand-400 to-brand-600'
          }`}
          style={{ width: `${progress}%` }}
        />
        {expected > 0 && expectedPct < 100 && (
          <div
            className="absolute inset-y-0 w-0.5 bg-slate-400 dark:bg-slate-500"
            style={{ left: `${expectedPct}%` }}
            aria-hidden
            title={`Jornada: ${formatHM(expected)}`}
          />
        )}
      </div>

      <div className="relative h-2.5 px-0.5">
        {ticks.map((h) => {
          const pct = ((h * 60) / scale) * 100;
          return (
            <span
              key={h}
              className="absolute -translate-x-1/2 top-0 text-[8px] font-mono text-slate-400 dark:text-slate-500"
              style={{ left: `${pct}%` }}
            >
              {h}h
            </span>
          );
        })}
      </div>

      <div className="flex items-center justify-end text-[10px] font-mono">
        {phase === 'done' ? (
          <span
            className={
              balance >= 0
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-red-600 dark:text-red-400 font-bold'
            }
          >
            {balance >= 0 ? '+' : '−'}
            {formatHM(Math.abs(balance))}
          </span>
        ) : (
          <span className="text-slate-500 dark:text-slate-400">
            Falta {formatHM(remaining)}
          </span>
        )}
      </div>
    </div>
  );
}
