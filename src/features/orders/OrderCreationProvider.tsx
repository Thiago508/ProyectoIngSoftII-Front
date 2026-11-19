import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ApiError, createApiClient } from '../../shared/api/apiClient';
import { getApiBaseUrl } from '../../shared/api/apiConfig';
import type { ApiCart } from '../cart/cartApi';
import { OrderCreationContext, type CreationState } from './OrderCreationContext';
import { createApiOrder, isOrderRejection, orderItems, OrderCreationResponseError } from './createApiOrder';
import { beginCreationMarker, clearCreationMarker, hasPendingCreation } from './creationMarker';
import { getApiOrder } from './ordersApi';

const initial = (): CreationState => ({ phase: hasPendingCreation() ? 'uncertain' : 'idle', order: null, reference: null, error: '' });
export function OrderCreationProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const token = auth.session?.accessToken ?? null;
  const [owner, setOwner] = useState(token);
  const [state, setState] = useState<CreationState>(initial);
  const [recovering, setRecovering] = useState(false);
  if (owner !== token) { setOwner(token); setState(initial()); setRecovering(false); }
  const pending = useRef<{ token: string; controller: AbortController } | null>(null);
  const latestAuth = useRef(auth);
  useEffect(() => { latestAuth.current = auth; }, [auth]);
  useEffect(() => () => { if (pending.current?.token === token) { pending.current.controller.abort(); pending.current = null; } }, [token]);

  async function create(cart: ApiCart) {
    if (!token || !auth.session || pending.current || state.phase !== 'idle') return;
    if (hasPendingCreation()) { setState({ ...initial(), phase: 'uncertain' }); return; }
    // Preparar el cuerpo y la URL antes de marcar/despachar una operación sin idempotencia.
    let client: ReturnType<typeof createApiClient>;
    try { orderItems(cart); client = createApiClient(getApiBaseUrl()); beginCreationMarker(); }
    catch (cause) { setState({ phase: 'rejected', order: null, reference: null, error: cause instanceof Error ? cause.message : 'No se pudo preparar la solicitud. No se envió ningún pedido.' }); return; }
    const controller = new AbortController(); pending.current = { token, controller };
    setState({ phase: 'submitting', order: null, reference: null, error: '' });
    try {
      const order = await createApiOrder(client, token, auth.session.user.id, cart, controller.signal);
      if (controller.signal.aborted) return;
      clearCreationMarker(); setState({ phase: 'created', order, reference: order.id, error: '' });
    } catch (cause: unknown) {
      if (controller.signal.aborted) return; // La marca queda: cancelar fetch no cancela el pedido en servidor.
      if (cause instanceof ApiError && cause.status === 401) latestAuth.current.invalidateSession(token);
      const rejected = isOrderRejection(cause);
      if (rejected) clearCreationMarker();
      const message = cause instanceof ApiError && cause.status === 403 ? 'No tienes permiso para crear este pedido.' : cause instanceof ApiError && cause.issues.length ? cause.issues.map((issue) => issue.message).join(' ') : cause instanceof Error ? cause.message : 'No se pudo confirmar la creación.';
      setState({ phase: rejected ? 'rejected' : 'uncertain', order: null, reference: cause instanceof OrderCreationResponseError ? cause.orderId : null, error: message });
    } finally { if (pending.current?.controller === controller) pending.current = null; }
  }
  async function recover() {
    if (!token || !auth.session || pending.current || state.reference === null || state.phase !== 'uncertain') return;
    const controller = new AbortController(); pending.current = { token, controller }; setRecovering(true);
    try {
      const order = await getApiOrder(createApiClient(getApiBaseUrl()), token, auth.session.user.id, String(state.reference), controller.signal);
      if (controller.signal.aborted) return;
      if (!order) throw new Error('El pedido recibido todavía no está disponible para tu cuenta.');
      clearCreationMarker(); setState({ phase: 'created', order, reference: order.id, error: '' });
    } catch (cause) {
      if (controller.signal.aborted) return;
      if (cause instanceof ApiError && cause.status === 401) latestAuth.current.invalidateSession(token);
      setState((previous) => ({ ...previous, error: cause instanceof Error ? cause.message : 'No se pudo consultar el pedido.' }));
    } finally { if (pending.current?.controller === controller) pending.current = null; if (!controller.signal.aborted) setRecovering(false); }
  }
  return <OrderCreationContext.Provider value={{ ...state, recovering, create, recover, prepareAnother: () => { if (!pending.current && (state.phase === 'created' || state.phase === 'rejected') && !hasPendingCreation()) setState(initial()); } }}>{children}</OrderCreationContext.Provider>;
}
