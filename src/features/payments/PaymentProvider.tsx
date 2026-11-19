import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ApiError, createApiClient } from '../../shared/api/apiClient';
import { getApiBaseUrl } from '../../shared/api/apiConfig';
import type { ApiOrder } from '../orders/ordersApi';
import { PaymentContext, type PaymentState } from './PaymentContext';
import { payApiOrder, type TestCardToken } from './paymentApi';
const initial = (): PaymentState => ({ busy: false, orderId: null, error: '', needsRead: false });
export function PaymentProvider({ children }: { children: ReactNode }) {
  const auth = useAuth(); const token = auth.session?.accessToken ?? null;
  const [owner, setOwner] = useState(token);
  const [state, setState] = useState<PaymentState>(initial);
  if (owner !== token) { setOwner(token); setState(initial()); }
  const pending = useRef<{ token: string; controller: AbortController } | null>(null);
  const latestAuth = useRef(auth);
  useEffect(() => { latestAuth.current = auth; }, [auth]);
  useEffect(() => () => { if (pending.current?.token === token) { pending.current.controller.abort(); pending.current = null; } }, [token]);
  async function pay(order: ApiOrder, cardToken: TestCardToken): Promise<ApiOrder | null> {
    if (!token || !auth.session || pending.current || state.busy || (state.needsRead && state.orderId === order.id)) return null;
    const controller = new AbortController(); pending.current = { token, controller };
    setState({ busy: true, orderId: order.id, error: '', needsRead: false });
    try {
      const confirmed = await payApiOrder(createApiClient(getApiBaseUrl()), token, auth.session.user.id, order, cardToken, controller.signal);
      if (controller.signal.aborted) return null;
      setState({ busy: false, orderId: order.id, error: '', needsRead: false });
      return confirmed;
    } catch (cause: unknown) {
      if (controller.signal.aborted) return null;
      if (cause instanceof ApiError && cause.status === 401) latestAuth.current.invalidateSession(token);
      const message = cause instanceof ApiError && cause.status === 403 ? 'No tienes permiso para pagar este pedido.' : cause instanceof ApiError && cause.issues.length ? cause.issues.map((issue) => issue.message).join(' ') : cause instanceof Error ? cause.message : 'No se pudo confirmar el resultado del pago.';
      setState({ busy: false, orderId: order.id, error: `${message} Consulta el resultado antes de intentar otro pago.`, needsRead: true });
      return null;
    } finally { if (pending.current?.controller === controller) pending.current = null; }
  }
  return <PaymentContext.Provider value={{ ...state, pay, acknowledgeRead: (orderId) => { if (!pending.current && state.orderId === orderId && state.needsRead) setState(initial()); } }}>{children}</PaymentContext.Provider>;
}
