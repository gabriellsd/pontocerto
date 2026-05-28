import { LogOut, Mail } from 'lucide-react';
import { SettingsSection } from './SettingsSection';

interface AccountSectionProps {
  userEmail: string | null;
  onSignOut: () => Promise<void>;
}

export function AccountSection({ userEmail, onSignOut }: AccountSectionProps) {
  return (
    <SettingsSection
      embedded
      Icon={Mail}
      title="Conta"
      description="Os dados sincronizam na nuvem com o mesmo e-mail em todos os dispositivos"
    >
      <div className="space-y-3">
        <div className="p-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">
            E-mail da conta
          </span>
          <span className="text-sm font-medium text-slate-800 dark:text-white break-all">
            {userEmail ?? '—'}
          </span>
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
          Use este e-mail e a mesma senha no computador e no celular. Ao entrar, os pontos são
          carregados automaticamente do Firebase.
        </p>

        <button
          type="button"
          onClick={() => void onSignOut()}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-white text-xs font-bold rounded-lg transition w-full sm:w-auto"
        >
          <LogOut className="w-3.5 h-3.5" />
          Terminar sessão
        </button>
      </div>
    </SettingsSection>
  );
}
