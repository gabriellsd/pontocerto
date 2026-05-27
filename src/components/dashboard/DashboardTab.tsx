import type { Employee, Holiday, PointLog, PointType, ShiftMark } from '../../types';
import type { ToastData } from '../Toast';
import { getShiftMark } from '../../utils/shiftMarks';
import { StatsBar } from './StatsBar';
import { Timeline } from './Timeline';
import { DateSelector } from './DateSelector';
import { LiveStatus } from './LiveStatus';

interface DashboardTabProps {
  now: Date;
  employee: Employee;
  selectedDate: string;
  todayStr: string;
  onChangeDate: (date: string) => void;
  dayLogs: PointLog[];
  allLogs: PointLog[];
  holidays: Holiday[];
  shiftMarks: ShiftMark[];
  note: string;
  onNoteChange: (n: string) => void;
  onRegister: (type: PointType) => void;
  onEditLog: (type: PointType) => void;
  toast: ToastData | null;
  onOpenPhoto: (log: PointLog) => void;
}

export function DashboardTab({
  now,
  employee,
  selectedDate,
  todayStr,
  onChangeDate,
  dayLogs,
  allLogs,
  holidays,
  shiftMarks,
  note,
  onNoteChange,
  onRegister,
  onEditLog,
  toast,
  onOpenPhoto,
}: DashboardTabProps) {
  const isToday = selectedDate === todayStr;
  const shiftMark = getShiftMark(employee.id, selectedDate, shiftMarks);

  return (
    <div className="space-y-2 sm:space-y-3" role="tabpanel">
      <DateSelector
        selectedDate={selectedDate}
        todayStr={todayStr}
        now={now}
        onChange={onChangeDate}
      />

      <StatsBar
        employee={employee}
        selectedDate={selectedDate}
        todayStr={todayStr}
        dayLogs={dayLogs}
        allLogs={allLogs}
        holidays={holidays}
        shiftMark={shiftMark}
      />

      <LiveStatus employee={employee} dayLogs={dayLogs} now={now} isToday={isToday} />

      <Timeline
        employee={employee}
        shiftMark={shiftMark}
        logs={dayLogs}
        isToday={isToday}
        now={now}
        note={note}
        onNoteChange={onNoteChange}
        onRegister={onRegister}
        onEditLog={onEditLog}
        onOpenPhoto={onOpenPhoto}
        toast={toast}
      />
    </div>
  );
}
