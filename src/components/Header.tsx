import { Clock, LogOut, Moon, Settings as SettingsIcon, Sun } from 'lucide-react';
import type { Employee, TabId } from '../types';
import { SyncBadge } from './SyncBadge';
import type { SyncStatus } from '../hooks/usePontoState';

interface HeaderProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onGoHome: () => void;
  onSignOut: () => Promise<void>;
  currentEmployee?: Employee;
  onOpenSettings: (tab: TabId) => void;
  syncStatus: SyncStatus;
  lastSyncedAt: Date | null;
}

export function Header({
  isDarkMode,
  onToggleTheme,
  onGoHome,
  onSignOut,
  currentEmployee,
  onOpenSettings,
  syncStatus,
  lastSyncedAt,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm transition-colors duration-200">
      <div className="relative max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-12 sm:h-14 flex items-center justify-between">
        <button
          type="button"
          onClick={onGoHome}
          aria-label="Ir para o painel inicial"
          title="Painel inicial"
          className="flex items-center gap-2 rounded-lg -ml-1 px-1 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
        >
          <div className="bg-brand-600 text-white p-1.5 rounded-lg shadow-md shadow-brand-500/20">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span className="text-base sm:text-lg font-bold bg-gradient-to-r from-brand-600 to-blue-500 bg-clip-text text-transparent">
            PontoCerto
          </span>
        </button>

        <div className="absolute left-1/2 -translate-x-1/2">
          <SyncBadge status={syncStatus} lastSyncedAt={lastSyncedAt} />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label="Alternar tema claro ou escuro"
            title="Alternar Tema"
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => onOpenSettings('settings')}
            aria-label="Abrir configurações do perfil"
            title="Abrir configurações"
            className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-700 pl-2 group cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-sm shrink-0 group-hover:ring-2 group-hover:ring-brand-500/30 transition">
              {currentEmployee?.name.charAt(0) ?? 'U'}
            </div>
            <span className="hidden lg:block text-xs font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[140px]">
              {currentEmployee?.name ?? 'Utilizador'}
            </span>
            <SettingsIcon className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition hidden lg:block" />
          </button>

          <button
            type="button"
            onClick={() => void onSignOut()}
            aria-label="Sair da conta"
            title="Sair"
            className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
