import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ApiError, createApiClient } from '../../shared/api/apiClient';
import { getApiBaseUrl } from '../../shared/api/apiConfig';
import type { ApiCart } from '../cart/cartApi';
import { OrderCreationContext, type CreationState } from './OrderCreationContext';
import { createApiOrder, isOrderRejection, orderItems, OrderCreationResponseError } from './createApiOrder';
import { beginCreationMarker, clearCreationMarker, hasPendingCreation } from './creationMarker';
import { emptyOrderShipping, matchesOrderShipping, orderShippingPayload } from './orderShipping';
import { verifyOrderShippingContract } from './orderContract';
import { getApiOrder } from './ordersApi';

const initial = (): CreationState => ({ phase: hasPendingCreation() ? 'uncertain' : 'idle', order: null, reference: null, error: '' });
export function OrderCreationProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const token = auth.session?.accessToken ?? null;
  const [owner, setOwner] = useState(token);
  const [state, setState] = useState<CreationState>(initial);
  const [shipping, setShipping] = useState(emptyOrderShipping);
  const [recovering, setRecovering] = useState(false);
  if (owner !== token) { setOwner(token); setState(initial()); setRecovering(false); setShipping(emptyOrderShipping); }
  const pending = useRef<{ token: string; controller: AbortController } | null>(null);
  const latestAuth = useRef(auth);
  useEffect(() => { latestAuth.current = auth; }, [auth]);
  useEffect(() => () => { if (pending.current?.token === token) { pending.current.controller.abort(); pending.current = null; } }, [token]);

  async function create(cart: ApiCart) {
    if (!token || !auth.session || pending.current || state.phase !== 'idle') return;
    if (hasPendingCreation()) { setState({ ...initial(), phase: 'uncertain' }); return; }
    const controller = new AbortController(); pending.current = { token, controller };
    let dispatched = false;
    setState({ phase: 'submitting', order: null, reference: null, error: '' });
    try {
      orderItems(cart); orderShippingPayload(shipping);
      const base = getApiBaseUrl();
      await verifyOrderShippingContract(base, controller.signal);
      if (controller.signal.aborted) return;
      beginCreationMarker(); dispatched = true;
      const order = await createApiOrder(createApiClient(base), token, auth.session.user.id, cart, shipping, controller.signal);
      if (controller.signal.aborted) return;
      clearCreationMarker(); setShipping(emptyOrderShipping); setState({ phase: 'created', order, reference: order.id, error: '' });
    } catch (cause: unknown) {
      if (controller.signal.aborted) return; // La marca queda: cancelar fetch no cancela el pedido en servidor.
      if (cause instanceof ApiError && cause.status === 401) latestAuth.current.invalidateSession(token);
      const rejected = !dispatched || isOrderRejection(cause);
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
      if (!matchesOrderShipping(order.shipping, shipping)) throw new Error('El pedido existe, pero el servidor no confirma los datos de envío enviados. Consulta con la tienda; no se ha repetido la creación.');
      clearCreationMarker(); setShipping(emptyOrderShipping); setState({ phase: 'created', order, reference: order.id, error: '' });
    } catch (cause) {
      if (controller.signal.aborted) return;
      if (cause instanceof ApiError && cause.status === 401) latestAuth.current.invalidateSession(token);
      setState((previous) => ({ ...previous, error: cause instanceof Error ? cause.message : 'No se pudo consultar el pedido.' }));
    } finally { if (pending.current?.controller === controller) pending.current = null; if (!controller.signal.aborted) setRecovering(false); }
  }
  return <OrderCreationContext.Provider value={{ ...state, shipping, setShipping: (next) => { if (!pending.current && (state.phase === 'idle' || state.phase === 'rejected')) setShipping(next); }, recovering, create, recover, prepareAnother: () => { if (!pending.current && (state.phase === 'created' || state.phase === 'rejected') && !hasPendingCreation()) setState(initial()); } }}>{children}</OrderCreationContext.Provider>;
}
