import { Loader2 } from 'lucide-react';

export function AuthLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-slate-900">
      <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
      <p className="text-sm text-slate-500 dark:text-slate-400">A carregar...</p>
    </div>
  );
}
