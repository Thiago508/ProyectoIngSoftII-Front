import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ApiError, createApiClient } from '../../shared/api/apiClient';
import { getApiBaseUrl } from '../../shared/api/apiConfig';
import { ApiCartContext, type CartResult } from './ApiCartContext';
import { requestCart, type ApiCart, type CartChange } from './cartApi';

export function ApiCartProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const token = auth.session?.accessToken ?? null;
  const [result, setResult] = useState<{ owner: string | null; cart: ApiCart | null; status: 'loading' | 'ready' | 'error'; error: string; busy: boolean } | null>(null);
  const [owner, setOwner] = useState(token);
  if (owner !== token) { setOwner(token); setResult(null); }
  const latestAuth = useRef(auth);
  useEffect(() => { latestAuth.current = auth; }, [auth]);
  const pending = useRef<{ token: string; controller: AbortController } | null>(null);
  useEffect(() => () => { if (pending.current?.token === token) { pending.current.controller.abort(); pending.current = null; } }, [token]);
  const current = result?.owner === token ? result : null;

  async function run(change?: CartChange): Promise<CartResult> {
    if (!token) return { ok: false, message: 'Inicia sesión para usar tu carrito del servidor.' };
    if (pending.current?.token === token) return { ok: false, message: 'Espera a que termine la operación actual.' };
    if (change && current?.status === 'error') return { ok: false, message: 'Consulta el carrito antes de repetir una operación.' };
    const controller = new AbortController();
    pending.current?.controller.abort();
    pending.current = { token, controller };
    setResult({ owner: token, cart: current?.cart ?? null, status: current?.status === 'ready' && change ? 'ready' : 'loading', error: '', busy: true });
    try {
      const cart = await requestCart(createApiClient(getApiBaseUrl()), token, controller.signal, change);
      if (controller.signal.aborted) return { ok: false, message: 'Operación cancelada. Consulta el carrito para confirmar su estado.' };
      setResult({ owner: token, cart, status: 'ready', error: '', busy: false });
      return { ok: true, message: change ? 'Carrito actualizado por el servidor.' : 'Carrito consultado.' };
    } catch (cause: unknown) {
      if (controller.signal.aborted) return { ok: false, message: 'Consulta cancelada.' };
      if (cause instanceof ApiError && cause.status === 401) latestAuth.current.invalidateSession(token);
      const detail = cause instanceof ApiError && cause.status === 403 ? 'No tienes permiso para realizar esta operación.' : cause instanceof Error ? cause.message : 'No se pudo consultar el carrito.';
      const message = change ? `${detail} Consulta el carrito antes de repetir: el cambio podría haberse aplicado.` : detail;
      setResult({ owner: token, cart: null, status: 'error', error: message, busy: false });
      return { ok: false, message };
    } finally { if (pending.current?.controller === controller) pending.current = null; }
  }
  return <ApiCartContext.Provider value={{ cart: current?.cart ?? null, status: current?.status ?? 'idle', busy: current?.busy ?? false, error: current?.error ?? '', refresh: () => run(), change: (change) => run(change) }}>{children}</ApiCartContext.Provider>;
}
