import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CustomerHeader } from '../../shared/components/CustomerHeader/CustomerHeader';
import { ApiError, createApiClient } from '../../shared/api/apiClient';
import { getApiBaseUrl } from '../../shared/api/apiConfig';
import { useAuth } from '../auth/AuthContext';
import { getApiOrder, validOrderId, type ApiOrder } from '../orders/ordersApi';
import { usePayment } from './PaymentContext';
import { canPayOrder, paymentOutcome, type TestCardToken } from './paymentApi';
import '../orders/OrderDetailPage.css';
const currency = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
export function ApiPaymentPage() {
  const { session } = useAuth(); const { orderId } = useParams();
  return <PaymentRequest key={`${session?.accessToken ?? 'anonymous'}:${orderId}`} orderId={orderId ?? ''} />;
}
function PaymentRequest({ orderId }: { orderId: string }) {
  const { session, invalidateSession } = useAuth(); const payment = usePayment();
  const token = session?.accessToken; const userId = session?.user.id;
  const [result, setResult] = useState<{ order: ApiOrder | null; error: string } | null>(null);
  const [loading, setLoading] = useState(Boolean(token && validOrderId(orderId)));
  const [cardToken, setCardToken] = useState<TestCardToken | ''>('');
  const pendingRead = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const heading = useRef<HTMLHeadingElement>(null); const error = useRef<HTMLParagraphElement>(null);
  const order = result?.order ?? null;
  const outcome = order ? paymentOutcome(order) : 'unconfirmed';
  const title = outcome === 'approved' ? 'Pago confirmado por el servidor' : outcome === 'rejected' ? 'Pago informado como rechazado' : 'Pago de prueba';
  const read = useCallback(() => {
    if (!token || userId === undefined || !validOrderId(orderId) || pendingRead.current) return Promise.resolve(null);
    const controller = new AbortController(); pendingRead.current = controller;
    return Promise.resolve().then(() => getApiOrder(createApiClient(getApiBaseUrl()), token, userId, orderId, controller.signal)).then((loaded) => {
      if (controller.signal.aborted) return null;
      setResult({ order: loaded, error: '' }); setLoading(false); setCardToken(''); return loaded;
    }, (cause: unknown) => {
      if (controller.signal.aborted) return null;
      if (cause instanceof ApiError && cause.status === 401) invalidateSession(token);
      setLoading(false); setResult({ order: null, error: cause instanceof ApiError && cause.status === 403 ? 'No tienes permiso para consultar este pedido.' : cause instanceof Error ? cause.message : 'No se pudo consultar el pedido.' });
      return null;
    }).finally(() => { if (pendingRead.current === controller) pendingRead.current = null; });
  }, [token, userId, orderId, invalidateSession]);
  useEffect(() => { mounted.current = true; void read(); return () => { mounted.current = false; pendingRead.current?.abort(); pendingRead.current = null; }; }, [read]);
  useEffect(() => { heading.current?.focus(); const previous = document.title; document.title = `${title} | Fashion Online Store`; return () => { document.title = previous; }; }, [title]);
  const paymentError = payment.orderId === Number(orderId) ? payment.error : '';
  useEffect(() => { if (!loading && (result?.error || paymentError)) error.current?.focus(); }, [result, loading, paymentError]);
  async function submit() {
    if (!order || !cardToken || loading || payment.busy || !canPayOrder(order)) return;
    const confirmed = await payment.pay(order, cardToken);
    if (!mounted.current) return;
    setCardToken('');
    if (confirmed) { setResult({ order: confirmed, error: '' }); heading.current?.focus(); }
  }
  async function refresh() {
    if (payment.busy || pendingRead.current) return;
    setLoading(true);
    const loaded = await read();
    if (loaded && mounted.current) { payment.acknowledgeRead(loaded.id); heading.current?.focus(); }
  }
  const needsRead = payment.needsRead && payment.orderId === Number(orderId);
  return <>
    <CustomerHeader catalogSource="api" cartItemCount={0} cartTo="/cart?source=api" homeTo="/catalog?source=api" contentHeadingId="payment-heading" skipLabel="Saltar al pago" />
    <main className="order-detail"><h1 id="payment-heading" ref={heading} tabIndex={-1}>{title}</h1>
      <p>Pasarela de prueba del backend. Se utilizan tokens de prueba, sin recoger número de tarjeta, CVV o datos bancarios.</p>
      {!session ? <p><Link to="/login" state={{ returnTo: `/orders/${orderId}/payment?source=api` }}>Inicia sesión para consultar y pagar tu pedido</Link></p> : loading ? <p role="status">Consultando pedido…</p> : result?.error ? <p ref={error} role="alert" tabIndex={-1} className="order-detail__error">{result.error}</p> : order ? <>
        <section className="order-detail__panel" aria-label="Pedido para pago"><h2>Pedido #{order.id}</h2><p>Total del servidor: {currency.format(order.total)}</p><p>Estado del pedido: {order.status}</p><p>Reserva: {order.reservationState}</p><p>Vencimiento informado: {order.reservationExpiresAt ?? 'No informado'}</p><p>Estado de pago: {order.payment?.status ?? 'Sin registro informado'}</p>{order.payment && <p>Importe del pago: {currency.format(order.payment.amount)}</p>}</section>
        {paymentError && <p ref={error} role="alert" tabIndex={-1} className="order-detail__error">{paymentError}</p>}
        {canPayOrder(order) && !needsRead ? <section className="order-detail__panel" aria-labelledby="test-payment-heading"><h2 id="test-payment-heading">Enviar pago de prueba</h2><div className="order-detail__lookup"><label htmlFor="test-card-token">Token de tarjeta de prueba</label><select id="test-card-token" value={cardToken} disabled={payment.busy} onChange={(event) => setCardToken(event.currentTarget.value as TestCardToken | '')}><option value="">Selecciona un token de prueba</option><option value="tok_ok">tok_ok — prueba de autorización</option><option value="tok_declined">tok_declined — prueba de rechazo</option></select><button type="button" disabled={!cardToken || payment.busy} onClick={() => { void submit(); }}>{payment.busy ? 'Procesando pago…' : 'Enviar pago de prueba'}</button></div><p>La pasarela decide el resultado. Seleccionar un token no aprueba ni cancela el pedido.</p></section> : <p>{needsRead ? 'El resultado del intento no está confirmado. Actualiza el pedido antes de repetir.' : 'El estado actual del pedido o de la reserva no permite iniciar otro pago.'}</p>}
        <p role="status" aria-atomic="true">{payment.busy ? 'Esperando el resultado del servidor…' : ''}</p>
      </> : <p>Este pedido no existe o no está disponible para tu cuenta.</p>}
      {session && validOrderId(orderId) && <button type="button" className="order-detail__button" disabled={loading || payment.busy} onClick={() => { void refresh(); }}>Consultar resultado del pago</button>}
      <nav className="order-detail__links" aria-label="Navegación del pago"><Link to={`/orders/${orderId}?source=api`}>Ver detalle del pedido</Link><Link to="/cart?source=api">Volver al carrito</Link></nav>
    </main>
  </>;
}
