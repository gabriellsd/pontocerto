import { useEffect, useRef } from 'react';
import type { Employee, PointLog } from '../types';
import { diffInMinutes, formatHM, getCurrentTimeStr, getTodayStr, timeStrToMinutes, WORK_LIMITS } from '../utils/time';

interface UseRemindersOpts {
  enabled: boolean;
  employee: Employee;
  todayLogs: PointLog[];
  now: Date;
}

type ReminderKey =
  | `lunch:${string}`         // hora de almoço (15 min antes do limite)
  | `lunch-overdue:${string}` // limite de 5h ultrapassado sem almoço
  | `back:${string}`          // voltar do almoço
  | `exit-soon:${string}`     // hora de sair próxima
  | `exit-late:${string}`     // já passou da hora prevista
  | `idle:${string}`;         // dia útil sem nenhuma marcação até X horas

function canNotify(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    Notification.permission === 'granted'
  );
}

function safeNotify(title: string, body: string): void {
  try {
    new Notification(title, {
      body,
      icon: '/vite.svg',
      tag: 'pontocerto',
    });
  } catch (err) {
    console.warn('Falha a criar notificação:', err);
  }
}

/**
 * Dispara lembretes oportunos enquanto o utilizador está no dia de hoje:
 *  - "Hora do almoço?"    → trabalhou ~metade da jornada sem ter saído para almoço
 *  - "Voltar do almoço"   → passaram `lunchMinutes` desde a saída para almoço
 *  - "Sair às HH:MM"      → 10 minutos antes da saída prevista
 *  - "Esqueceu da saída?" → 15 minutos depois da saída prevista sem ter marcado
 *  - "Ainda sem marcação" → 1h após `startTime` em dia útil sem qualquer marcação
 *
 * Cada lembrete é disparado uma única vez por dia.
 */
export function useReminders({ enabled, employee, todayLogs, now }: UseRemindersOpts): void {
  const sentRef = useRef<Set<ReminderKey>>(new Set());
  const lastDateRef = useRef<string>(getTodayStr(now));

  useEffect(() => {
    if (!enabled) return;
    if (!canNotify()) return;

    const today = getTodayStr(now);
    if (today !== lastDateRef.current) {
      sentRef.current = new Set();
      lastDateRef.current = today;
    }

    const ent = todayLogs.find((l) => l.type === 'Entrada')?.time;
    const alS = todayLogs.find((l) => l.type === 'Saída Almoço')?.time;
    const alR = todayLogs.find((l) => l.type === 'Retorno Almoço')?.time;
    const sai = todayLogs.find((l) => l.type === 'Saída')?.time;
    const nowStr = getCurrentTimeStr(now);
    const nowMin = timeStrToMinutes(nowStr);

    const dow = now.getDay();
    const isWorkDay = !employee.weekdaysOnly || (dow !== 0 && dow !== 6);

    const fire = (key: ReminderKey, title: string, body: string) => {
      if (sentRef.current.has(key)) return;
      sentRef.current.add(key);
      safeNotify(title, body);
    };

    if (isWorkDay && !ent) {
      const startMin = timeStrToMinutes(employee.startTime);
      if (nowMin - startMin >= 60) {
        fire(`idle:${today}`, 'Ponto não marcado', `Ainda não registou a entrada (hora de início: ${employee.startTime}).`);
      }
      return;
    }
    if (!ent) return;

    // Hora do almoço — quando se aproxima/excede o limite de 5h contínuas
    if (!alS && !sai) {
      const minutesWorked = diffInMinutes(ent, nowStr);
      // Avisa 15min antes de atingir o limite (4h45) e novamente ao ultrapassar (5h)
      const earlyThreshold = WORK_LIMITS.maxMorningMinutes - 15;
      if (minutesWorked >= WORK_LIMITS.maxMorningMinutes) {
        fire(
          `lunch-overdue:${today}`,
          'Limite de 5h atingido',
          `Já trabalhou ${formatHM(minutesWorked)} sem ir almoçar. Marque a saída para almoço o quanto antes.`
        );
      } else if (minutesWorked >= earlyThreshold) {
        fire(
          `lunch:${today}`,
          'Hora do almoço?',
          `Já trabalhou ${formatHM(minutesWorked)} desde a entrada. Limite: ${formatHM(WORK_LIMITS.maxMorningMinutes)}.`
        );
      }
    }

    // Voltar do almoço
    if (alS && !alR && !sai) {
      const sinceLunch = diffInMinutes(alS, nowStr);
      if (sinceLunch >= employee.lunchMinutes) {
        fire(`back:${today}`, 'Voltar do almoço', `Já se passaram ${employee.lunchMinutes} minutos desde o início do almoço.`);
      }
    }

    // Próximo da saída prevista
    if (alR && !sai) {
      const morning = diffInMinutes(ent, alS ?? nowStr);
      const remaining = Math.max(0, employee.dailyMinutes - morning);
      const exitMin = timeStrToMinutes(alR) + remaining;
      const diff = exitMin - nowMin;
      if (diff > 0 && diff <= 10) {
        const hh = Math.floor(exitMin / 60);
        const mm = exitMin % 60;
        fire(
          `exit-soon:${today}`,
          'Quase na hora de sair',
          `Saída prevista às ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}.`
        );
      } else if (diff < -15) {
        fire(`exit-late:${today}`, 'Esqueceu de marcar a saída?', 'Já passou da hora prevista de saída.');
      }
    }
  }, [enabled, employee, todayLogs, now]);
}
