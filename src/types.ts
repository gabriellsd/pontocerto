export type PointType = 'Entrada' | 'Saída Almoço' | 'Retorno Almoço' | 'Saída';

export const POINT_ORDER: PointType[] = [
  'Entrada',
  'Saída Almoço',
  'Retorno Almoço',
  'Saída',
];

export type Regime = 'Presencial' | 'Teletrabalho' | 'Híbrido';

export interface Employee {
  id: number;
  name: string;
  role: string;
  email: string;
  dailyMinutes: number; // jornada efetiva esperada em minutos (já sem almoço)
  regime: Regime;
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  lunchMinutes: number; // duração esperada do almoço em minutos
  weekdaysOnly: boolean; // se true, fim-de-semana é hora extra (não esperado)
}

export interface PointLog {
  employeeId: number;
  date: string; // YYYY-MM-DD
  type: PointType;
  time: string; // HH:MM
  note: string;
  photo: string | null;
}

/** Plantão sem registo de horários (domingo, feriado, etc.). */
export interface ShiftMark {
  employeeId: number;
  date: string; // YYYY-MM-DD
  note: string;
  markedAt: string; // ISO
}

export interface AppSettings {
  soundEnabled: boolean;
  enableWebcam: boolean;
  enableReminders: boolean;
  /** Dia em que começa cada ciclo da folha (ex.: 21). */
  payPeriodStartDay: number;
  /** Dia em que termina cada ciclo da folha (ex.: 20). */
  payPeriodEndDay: number;
  /** Salário mensal bruto (R$). Usado se valor hora = 0. */
  payMonthlySalary: number;
  /** Horas mensais de referência (CLT: 220). */
  payMonthlyHours: number;
  /** Valor hora (R$). Se > 0, tem prioridade sobre salário/220. */
  payHourlyRate: number;
  /** Multiplicador hora extra em dia útil (ex.: 1,5 = +50%). */
  overtimeMultiplier: number;
  /** Multiplicador plantão por hora (só se valor fixo/dia = 0). */
  shiftMultiplier: number;
  /** Valor fixo por dia de plantão / feriado em dia útil (ex.: R$ 150). */
  shiftFlatRate: number;
  /** Valor fixo por plantão em sábado ou domingo (ex.: R$ 300). */
  shiftWeekendFlatRate: number;
}

export interface PayPeriodConfig {
  startDay: number;
  endDay: number;
}

export interface Holiday {
  date: string; // YYYY-MM-DD
  label: string;
}

export interface AppState {
  employees: Employee[];
  logs: PointLog[];
  shiftMarks: ShiftMark[];
  holidays: Holiday[];
  currentEmployeeId: number;
  isDarkMode: boolean;
  settings: AppSettings;
}

export type TabId = 'dashboard' | 'history' | 'settings';

export type ModalKind = 'info' | 'warning' | 'danger' | 'success';

export interface BackupPayload {
  version: number;
  exportedAt: string;
  state: AppState;
}
