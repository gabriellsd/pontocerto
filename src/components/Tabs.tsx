import { Calendar, LayoutDashboard } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { TabId } from '../types';

interface TabsProps {
  active: TabId;
  onChange: (tab: TabId) => void;
}

const TABS: { id: TabId; label: string; Icon: LucideIcon }[] = [
  { id: 'dashboard', label: 'Painel', Icon: LayoutDashboard },
  { id: 'history', label: 'Histórico', Icon: Calendar },
];

export function Tabs({ active, onChange }: TabsProps) {
  // Configurações ficam acessíveis no header (evita duplicação e espaço perdido).
  if (active === 'settings') return null;

  return (
    <div
      className="flex w-full space-x-1 bg-slate-200/60 dark:bg-slate-800/60 p-1 rounded-xl mb-3 sm:mb-4"
      role="tablist"
    >
      {TABS.map(({ id, label, Icon }) => {
        const isActive = id === active;
        const base =
          'flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-2 sm:px-3 text-xs sm:text-sm font-medium rounded-lg transition-all';
        const activeCls = 'shadow-sm bg-white dark:bg-slate-700 text-brand-600 dark:text-white';
        const inactiveCls = 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white';
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(id)}
            className={`${base} ${isActive ? activeCls : inactiveCls}`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
