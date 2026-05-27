import type { AppSettings, AppState, Employee } from '../types';

export const defaultSettings: AppSettings = {
  soundEnabled: true,
  enableWebcam: true,
  enableReminders: false,
  payPeriodStartDay: 21,
  payPeriodEndDay: 20,
  payMonthlySalary: 0,
  payMonthlyHours: 220,
  payHourlyRate: 0,
  overtimeMultiplier: 1.5,
  shiftMultiplier: 2,
  shiftFlatRate: 150,
  shiftWeekendFlatRate: 150,
};

export const defaultEmployees: Employee[] = [
  {
    id: 1,
    name: 'Utilizador',
    role: 'Cargo / Função',
    email: 'utilizador@pontocerto.com',
    dailyMinutes: 528, // 8h48 efetivas
    regime: 'Presencial',
    startTime: '06:00',
    endTime: '15:58',
    lunchMinutes: 70, // 1h10 de intervalo
    weekdaysOnly: true,
  },
];

export const initialState: AppState = {
  employees: defaultEmployees,
  logs: [],
  shiftMarks: [],
  holidays: [],
  currentEmployeeId: 1,
  isDarkMode: false,
  settings: defaultSettings,
};

export const STORAGE_KEY = 'pontocerto_state';
