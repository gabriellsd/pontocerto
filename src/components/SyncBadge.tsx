import { CheckCircle2, CloudOff, Loader2, RefreshCw, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { SyncStatus } from '../hooks/usePontoState';

interface SyncBadgeProps {
  status: SyncStatus;
  lastSyncedAt: Date | null;
}

const PALETTES: Record<SyncStatus, { Icon: LucideIcon; label: string; cls: string; spin?: boolean }> = {
  loading: {
    Icon: Loader2,
    label: 'A carregar...',
    cls: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
    spin: true,
  },
  syncing: {
    Icon: RefreshCw,
    label: 'A sincronizar',
    cls: 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400',
    spin: true,
  },
  synced: {
    Icon: CheckCircle2,
    label: 'Sincronizado',
    cls: 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400',
  },
  offline: {
    Icon: CloudOff,
    label: 'Offline',
    cls: 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
  },
  error: {
    Icon: XCircle,
    label: 'Erro',
    cls: 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400',
  },
};

export function SyncBadge({ status, lastSyncedAt }: SyncBadgeProps) {
  const p = PALETTES[status];
  const { Icon } = p;
  const title =
    status === 'synced' && lastSyncedAt
      ? `Última sincronização: ${lastSyncedAt.toLocaleTimeString('pt-PT')}`
      : status === 'offline'
      ? 'Nuvem indisponível — a usar cache local neste aparelho'
      : p.label;

  return (
    <span
      title={title}
      aria-label={title}
      className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${p.cls}`}
    >
      <Icon className={`w-3.5 h-3.5 ${p.spin ? 'animate-spin' : ''}`} />
      <span>{p.label}</span>
    </span>
  );
}
