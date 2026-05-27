import { useState } from 'react';
import {
  Banknote,
  CalendarOff,
  Clock,
  Database,
  Settings,
  SlidersHorizontal,
  Upload,
  UserCircle,
  type LucideIcon,
} from 'lucide-react';
import type { AppSettings, Employee, Holiday, PointLog } from '../types';
import { ProfileSection } from './settings/ProfileSection';
import { ScheduleSection } from './settings/ScheduleSection';
import { PaySection } from './settings/PaySection';
import { PreferencesSection } from './settings/PreferencesSection';
import { HolidaysSection } from './settings/HolidaysSection';
import { ImportSection } from './settings/ImportSection';
import { DataSection } from './settings/DataSection';

interface SettingsTabProps {
  employee: Employee;
  logs: PointLog[];
  holidays: Holiday[];
  settings: AppSettings;
  isDarkMode: boolean;
  onUpdateEmployee: (id: number, patch: Partial<Omit<Employee, 'id'>>) => void;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onSetHoliday: (date: string, label: string) => void;
  onRemoveHoliday: (date: string) => void;
  onToggleDark: () => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
  onImportPoints: (logs: PointLog[], opts: { overwrite: boolean }) => { added: number; replaced: number };
  onReset: () => void;
  onClearPoints: () => void;
  onResultToast: (message: string, kind: 'green' | 'red' | 'yellow') => void;
}

type SettingsPanelId = 'profile' | 'schedule' | 'pay' | 'preferences' | 'holidays' | 'import' | 'data';

const SETTINGS_MENU: { id: SettingsPanelId; label: string; Icon: LucideIcon }[] = [
  { id: 'profile', label: 'Perfil', Icon: UserCircle },
  { id: 'schedule', label: 'Jornada', Icon: Clock },
  { id: 'pay', label: 'Remuneração', Icon: Banknote },
  { id: 'preferences', label: 'Preferências', Icon: SlidersHorizontal },
  { id: 'holidays', label: 'Feriados', Icon: CalendarOff },
  { id: 'import', label: 'Importar', Icon: Upload },
  { id: 'data', label: 'Dados & Backup', Icon: Database },
];

export function SettingsTab(props: SettingsTabProps) {
  const [panel, setPanel] = useState<SettingsPanelId>('profile');

  return (
    <div role="tabpanel" className="space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-start gap-3 lg:gap-0 lg:bg-white lg:dark:bg-slate-800 lg:rounded-2xl lg:border lg:border-slate-200 lg:dark:border-slate-700 lg:shadow-sm lg:overflow-hidden">
        <nav
          className="shrink-0 lg:w-52 xl:w-56 lg:border-r lg:border-slate-200 lg:dark:border-slate-700 lg:p-3"
          aria-label="Secções de definições"
        >
          <div className="hidden lg:flex items-center gap-2 px-2 mb-3">
            <div className="p-1.5 rounded-lg bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-white">Definições</h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Escolha uma secção</p>
            </div>
          </div>

          <div
            className="flex lg:flex-col gap-1 overflow-x-auto pb-0.5 lg:pb-0 -mx-1 px-1 lg:mx-0 lg:px-0 scrollbar-thin"
            role="tablist"
            aria-orientation="vertical"
          >
            {SETTINGS_MENU.map(({ id, label, Icon }) => {
              const active = panel === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setPanel(id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition shrink-0 lg:shrink lg:w-full ${
                    active
                      ? 'bg-brand-600 text-white shadow-sm lg:bg-brand-50 lg:dark:bg-brand-950/40 lg:text-brand-700 lg:dark:text-brand-300 lg:shadow-none'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hover:bg-slate-100 lg:dark:hover:bg-slate-700/60'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        <div className="flex-1 min-w-0 lg:p-3 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
          {panel === 'profile' && (
            <ProfileSection
              employee={props.employee}
              onSave={(patch) => props.onUpdateEmployee(props.employee.id, patch)}
              onClearPoints={props.onClearPoints}
            />
          )}
          {panel === 'schedule' && (
            <ScheduleSection
              employee={props.employee}
              onSave={(patch) => props.onUpdateEmployee(props.employee.id, patch)}
            />
          )}
          {panel === 'pay' && (
            <PaySection settings={props.settings} onUpdateSettings={props.onUpdateSettings} />
          )}
          {panel === 'preferences' && (
            <PreferencesSection
              settings={props.settings}
              isDarkMode={props.isDarkMode}
              onToggleDark={props.onToggleDark}
              onUpdateSettings={props.onUpdateSettings}
            />
          )}
          {panel === 'holidays' && (
            <HolidaysSection
              holidays={props.holidays}
              onSetHoliday={props.onSetHoliday}
              onRemoveHoliday={props.onRemoveHoliday}
            />
          )}
          {panel === 'import' && (
            <ImportSection
              employeeId={props.employee.id}
              onImport={props.onImportPoints}
              onResultToast={props.onResultToast}
            />
          )}
          {panel === 'data' && (
            <DataSection
              logsCount={props.logs.length}
              onExportBackup={props.onExportBackup}
              onImportBackup={props.onImportBackup}
              onReset={props.onReset}
            />
          )}
        </div>
      </div>
    </div>
  );
}
