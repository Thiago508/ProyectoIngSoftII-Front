import { useEffect, useState, type ReactNode } from 'react';
import { AuthContext } from './AuthContext';
import type { AuthSession } from './authApi';

export function AuthProvider({ children, onIdentityChange }: { children: ReactNode; onIdentityChange: () => void }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [expired, setExpired] = useState(false);

  function signIn(next: AuthSession) {
    if (next.expiresAt <= Date.now()) throw new Error('La sesión recibida ya venció. Vuelve a iniciar sesión.');
    if (session?.user.id !== next.user.id) onIdentityChange();
    setExpired(false);
    setSession(next);
  }
  function logout() {
    setSession(null);
    setExpired(false);
    onIdentityChange();
  }

  function invalidateSession(token: string) {
    if (session?.accessToken !== token) return;
    setSession(null);
    setExpired(true);
    onIdentityChange();
  }

  useEffect(() => {
    if (!session) return;
    const expiresAt = session.expiresAt;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    function checkExpiry() {
      if (!active) return;
      clearTimeout(timer);
      const remaining = expiresAt - Date.now();
      if (remaining <= 0) {
        active = false;
        setSession(null);
        setExpired(true);
        onIdentityChange();
      } else timer = setTimeout(checkExpiry, Math.min(remaining, 2_147_483_647));
    }
    checkExpiry();
    window.addEventListener('focus', checkExpiry);
    document.addEventListener('visibilitychange', checkExpiry);
    return () => {
      active = false;
      clearTimeout(timer);
      window.removeEventListener('focus', checkExpiry);
      document.removeEventListener('visibilitychange', checkExpiry);
    };
  }, [session, onIdentityChange]);

  return <AuthContext.Provider value={{ session, expired, signIn, logout, invalidateSession }}>{children}</AuthContext.Provider>;
}
