import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type ToastColor = 'green' | 'red' | 'yellow';

export interface ToastData {
  message: string;
  color: ToastColor;
}

interface ToastProps {
  toast: ToastData | null;
}

const PALETTES: Record<ToastColor, { cls: string; iconCls: string; Icon: LucideIcon }> = {
  green: {
    cls: 'bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-900 text-green-800 dark:text-green-300',
    iconCls: 'text-green-500',
    Icon: CheckCircle2,
  },
  red: {
    cls: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-800 dark:text-red-300',
    iconCls: 'text-red-500',
    Icon: AlertCircle,
  },
  yellow: {
    cls: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300',
    iconCls: 'text-amber-500',
    Icon: AlertTriangle,
  },
};

export function Toast({ toast }: ToastProps) {
  if (!toast) return null;
  const p = PALETTES[toast.color] ?? PALETTES.green;
  const { Icon } = p;
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center p-4 rounded-xl border transition-all ${p.cls}`}
    >
      <Icon className={`w-5 h-5 mr-3 shrink-0 ${p.iconCls}`} />
      <div className="text-sm font-medium">{toast.message}</div>
    </div>
  );
}
