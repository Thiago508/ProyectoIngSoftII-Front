import { createContext, useContext } from 'react';
import type { AuthSession } from './authApi';

export interface AuthState {
  session: AuthSession | null;
  expired: boolean;
  signIn: (session: AuthSession) => void;
  logout: () => void;
}
export const AuthContext = createContext<AuthState | undefined>(undefined);
export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) throw new Error('La sesión requiere AuthProvider.');
  return value;
}
