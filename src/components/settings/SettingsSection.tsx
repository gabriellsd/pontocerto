import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface SettingsSectionProps {
  Icon: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  /** Sem card exterior — usado dentro do layout com menu lateral */
  embedded?: boolean;
}

export function SettingsSection({ Icon, title, description, children, actions, embedded }: SettingsSectionProps) {
  const shell = embedded
    ? 'space-y-3 bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm lg:bg-transparent lg:dark:bg-transparent lg:border-0 lg:shadow-none lg:p-0 lg:rounded-none'
    : 'bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3';

  return (
    <section className={shell}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-start gap-2">
          <div className="p-1.5 rounded-lg bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 shrink-0">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">{title}</h2>
            {description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex flex-wrap gap-1.5 shrink-0">{actions}</div>}
      </div>
      <div>{children}</div>
    </section>
  );
}
