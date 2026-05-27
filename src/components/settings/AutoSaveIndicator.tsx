import { Check, Loader2 } from 'lucide-react';
import type { AutoSaveStatus } from '../../hooks/useAutoSave';

interface AutoSaveIndicatorProps {
  status: AutoSaveStatus;
}

export function AutoSaveIndicator({ status }: AutoSaveIndicatorProps) {
  if (status === 'idle') {
    return (
      <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">
        Guarda automaticamente
      </span>
    );
  }
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
        <Loader2 className="w-3 h-3 animate-spin" />
        A guardar...
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
      <Check className="w-3 h-3" />
      Guardado
    </span>
  );
}
