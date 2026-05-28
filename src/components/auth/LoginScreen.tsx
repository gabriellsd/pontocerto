import { useState } from 'react';
import { Clock, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

type Mode = 'login' | 'register';

export function LoginScreen() {
  const { configured, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!configured) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-3">
          <h1 className="text-lg font-bold text-slate-800 dark:text-white">Firebase não configurado</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Crie um projeto no Firebase Console, ative <strong>Authentication</strong> (e-mail/senha) e{' '}
            <strong>Firestore</strong>, depois copie as chaves para um ficheiro <code className="font-mono text-xs">.env</code>{' '}
            na raiz do projeto (veja <code className="font-mono text-xs">.env.example</code>).
          </p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || password.length < 6) {
      setError('Use um e-mail válido e senha com pelo menos 6 caracteres.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'login') await signIn(email, password);
      else await signUp(email, password);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha na autenticação.';
      setError(translateAuthError(msg));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900">
      <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg p-6 space-y-4">
        <div className="flex items-center gap-2 justify-center">
          <div className="bg-brand-600 text-white p-2 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-white">PontoCerto</h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Entre com a mesma conta no PC e no celular
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="auth-email" className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
              E-mail
            </label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="ponto-input w-full"
              placeholder="seu@email.com"
            />
          </div>
          <div>
            <label htmlFor="auth-pass" className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
              Senha
            </label>
            <input
              id="auth-pass"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="ponto-input w-full"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-bold rounded-lg transition flex items-center justify-center gap-2"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
          {mode === 'login' ? 'Ainda não tem conta?' : 'Já tem conta?'}{' '}
          <button
            type="button"
            className="text-brand-600 dark:text-brand-400 font-semibold hover:underline"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError(null);
            }}
          >
            {mode === 'login' ? 'Registar' : 'Entrar'}
          </button>
        </p>
      </div>
    </div>
  );
}

function translateAuthError(message: string): string {
  if (message.includes('auth/invalid-credential') || message.includes('auth/wrong-password')) {
    return 'E-mail ou senha incorretos.';
  }
  if (message.includes('auth/email-already-in-use')) {
    return 'Este e-mail já está registado. Use Entrar.';
  }
  if (message.includes('auth/weak-password')) {
    return 'Senha fraca. Use pelo menos 6 caracteres.';
  }
  if (message.includes('auth/invalid-email')) {
    return 'E-mail inválido.';
  }
  if (message.includes('auth/too-many-requests')) {
    return 'Muitas tentativas. Aguarde um momento.';
  }
  return message;
}
