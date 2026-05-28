import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { getFirebaseAuth, isFirebaseConfigured } from '../firebase/config';

interface AuthContextValue {
  user: User | null;
  isGuest: boolean;
  loading: boolean;
  configured: boolean;
  signInWithGoogle: () => Promise<void>;
  continueAsGuest: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const GUEST_MODE_KEY = 'pontocerto_guest_mode';

function shouldPreferRedirectFlow(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  // Browser embutido do Cursor costuma bloquear/encerrar popups OAuth.
  return /CursorBrowser|Cursor/i.test(ua);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(() => {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(GUEST_MODE_KEY) === '1';
  });
  const [loading, setLoading] = useState(true);
  const configured = isFirebaseConfigured();

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    const auth = getFirebaseAuth();
    return onAuthStateChanged(auth, (next) => {
      setUser(next);
      if (next) {
        setIsGuest(false);
        localStorage.removeItem(GUEST_MODE_KEY);
      }
      setLoading(false);
    });
  }, [configured]);

  const signInWithGoogle = useCallback(async () => {
    setIsGuest(false);
    localStorage.removeItem(GUEST_MODE_KEY);
    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    if (shouldPreferRedirectFlow()) {
      await signInWithRedirect(auth, provider);
      return;
    }
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      // Em alguns navegadores mobile, popup é bloqueado: cai para redirect.
      if (code === 'auth/popup-blocked' || code === 'auth/cancelled-popup-request') {
        await signInWithRedirect(auth, provider);
        return;
      }
      throw err;
    }
  }, []);

  const continueAsGuest = useCallback(() => {
    setIsGuest(true);
    localStorage.setItem(GUEST_MODE_KEY, '1');
  }, []);

  const signOut = useCallback(async () => {
    if (isGuest) {
      setIsGuest(false);
      localStorage.removeItem(GUEST_MODE_KEY);
      return;
    }
    await firebaseSignOut(getFirebaseAuth());
  }, [isGuest]);

  const value = useMemo(
    () => ({ user, isGuest, loading, configured, signInWithGoogle, continueAsGuest, signOut }),
    [user, isGuest, loading, configured, signInWithGoogle, continueAsGuest, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
