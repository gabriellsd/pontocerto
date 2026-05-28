import { useState } from 'react';
import { Clock, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function LoginScreen() {
  const { configured, signInWithGoogle, continueAsGuest } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!configured) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-3">
          <h1 className="text-lg font-bold text-slate-800 dark:text-white">Firebase não configurado</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Crie um projeto no Firebase Console, ative <strong>Authentication (Google)</strong> e{' '}
            <strong>Firestore</strong>, depois copie as chaves para um ficheiro <code className="font-mono text-xs">.env</code>{' '}
            na raiz do projeto (veja <code className="font-mono text-xs">.env.example</code>).
          </p>
        </div>
      </div>
    );
  }

  const handleGoogleSignIn = async () => {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha na autenticação.';
      setError(translateAuthError(msg));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900">
      <div className="w-full max-w-sm rounded-3xl border border-slate-200/80 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 shadow-xl p-6 sm:p-7 space-y-5">
        <div className="space-y-3 text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-600 to-blue-500 text-white flex items-center justify-center shadow-md shadow-brand-600/30">
            <Clock className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-white">PontoCerto</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Controle de ponto com sincronização na nuvem
            </p>
          </div>
        </div>

        <div className="space-y-3.5">
          {error && (
            <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={() => void handleGoogleSignIn()}
            disabled={busy}
            className="w-full h-11 bg-white hover:bg-slate-50 disabled:opacity-60 text-slate-700 text-sm font-bold rounded-xl transition flex items-center justify-center gap-2.5 border border-slate-300 shadow-sm"
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#EA4335"
                  d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.9-5.4 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.8 3.2 14.6 2.3 12 2.3 6.7 2.3 2.4 6.6 2.4 12s4.3 9.7 9.6 9.7c5.5 0 9.2-3.9 9.2-9.3 0-.6-.1-1.1-.2-1.6H12z"
                />
              </svg>
            )}
            Entrar com Google
          </button>

          <button
            type="button"
            onClick={continueAsGuest}
            disabled={busy}
            className="w-full h-10 text-slate-600 dark:text-slate-300 text-sm font-semibold rounded-xl transition border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60"
          >
            Entrar como convidado
          </button>

          <p className="text-[11px] text-center text-slate-400 dark:text-slate-500">
            Acesso seguro com sua conta Google
          </p>
        </div>
      </div>
    </div>
  );
}

function translateAuthError(message: string): string {
  if (message.includes('auth/popup-closed-by-user')) {
    return 'Login cancelado antes de concluir.';
  }
  if (message.includes('auth/too-many-requests')) {
    return 'Muitas tentativas. Aguarde um momento.';
  }
  if (message.includes('auth/operation-not-allowed')) {
    return 'Provedor Google não ativado no Firebase Authentication.';
  }
  return message;
}
