import { useEffect } from 'react';
import { AlertOctagon, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ModalKind } from '../../types';

export interface GenericModalConfig {
  title: string;
  message: string;
  kind: ModalKind;
  confirmText: string;
  showCancel: boolean;
  onResolve: (result: boolean) => void;
}

interface GenericModalProps {
  config: GenericModalConfig | null;
}

const PALETTES: Record<ModalKind, { wrap: string; btn: string; Icon: LucideIcon }> = {
  info: {
    wrap: 'bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400',
    btn: 'bg-brand-600 hover:bg-brand-700 text-white',
    Icon: Info,
  },
  warning: {
    wrap: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',
    btn: 'bg-amber-600 hover:bg-amber-700 text-white',
    Icon: AlertTriangle,
  },
  danger: {
    wrap: 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400',
    btn: 'bg-red-600 hover:bg-red-700 text-white',
    Icon: AlertOctagon,
  },
  success: {
    wrap: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
    btn: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    Icon: CheckCircle2,
  },
};

export function GenericModal({ config }: GenericModalProps) {
  useEffect(() => {
    if (!config) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') config.onResolve(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [config]);

  if (!config) return null;
  const p = PALETTES[config.kind];
  const { Icon } = p;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) config.onResolve(false);
      }}
    >
      <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700">
        <div className="p-6 space-y-4">
          <div className="flex items-start space-x-3">
            <div className={`p-2.5 rounded-xl shrink-0 ${p.wrap}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">{config.title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{config.message}</p>
            </div>
          </div>
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex space-x-3 justify-end">
            {config.showCancel && (
              <button
                type="button"
                onClick={() => config.onResolve(false)}
                className="py-2.5 px-5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Cancelar
              </button>
            )}
            <button
              type="button"
              onClick={() => config.onResolve(true)}
              className={`py-2.5 px-5 text-sm font-bold rounded-xl shadow-md transition ${p.btn}`}
            >
              {config.confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
