import type { ShiftMark } from '../types';

export function getShiftMark(
  employeeId: number,
  date: string,
  shiftMarks: ShiftMark[]
): ShiftMark | undefined {
  return shiftMarks.find((m) => m.employeeId === employeeId && m.date === date);
}

export function hasShiftMark(employeeId: number, date: string, shiftMarks: ShiftMark[]): boolean {
  return Boolean(getShiftMark(employeeId, date, shiftMarks));
}
