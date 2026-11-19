import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CustomerHeader } from '../../shared/components/CustomerHeader/CustomerHeader';
import { ApiError, createApiClient } from '../../shared/api/apiClient';
import { getApiBaseUrl } from '../../shared/api/apiConfig';
import { useAuth } from '../auth/AuthContext';
import { getApiOrder, validOrderId, type ApiOrder } from './ordersApi';
import './OrderDetailPage.css';

const currency = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
export function ApiOrderPage() {
  const { session } = useAuth();
  const { orderId } = useParams();
  return <OrderRequest key={`${session?.accessToken ?? 'anonymous'}:${orderId ?? 'lookup'}`} orderId={orderId} />;
}
function OrderRequest({ orderId }: { orderId?: string }) {
  const { session, invalidateSession } = useAuth();
  const [draftId, setDraftId] = useState(orderId ?? '');
  const [fieldError, setFieldError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ attempt: number; order?: ApiOrder | null; error?: string } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const error = useRef<HTMLParagraphElement>(null);
  const navigate = useNavigate();
  const valid = orderId !== undefined && validOrderId(orderId);
  const loading = Boolean(session && valid && result?.attempt !== attempt);
  const order = result?.attempt === attempt ? result.order : undefined;
  const title = !orderId ? 'Consultar pedido' : !session || loading ? 'Detalle del pedido' : order ? `Pedido #${order.id}` : result?.error ? 'No se pudo consultar el pedido' : 'Pedido no disponible';
  const token = session?.accessToken;
  const userId = session?.user.id;
  useEffect(() => {
    heading.current?.focus(); const previous = document.title; document.title = `${title} | Fashion Online Store`;
    return () => { document.title = previous; };
  }, [title]);
  useEffect(() => {
    if (!token || userId === undefined || !orderId || !valid) return;
    const controller = new AbortController();
    void Promise.resolve().then(() => getApiOrder(createApiClient(getApiBaseUrl()), token, userId, orderId, controller.signal)).then((loaded) => {
      if (!controller.signal.aborted) setResult({ attempt, order: loaded });
    }, (cause: unknown) => {
      if (controller.signal.aborted) return;
      if (cause instanceof ApiError && cause.status === 401) invalidateSession(token);
      setResult({ attempt, error: cause instanceof ApiError && cause.status === 403 ? 'No tienes permiso para consultar este pedido.' : cause instanceof Error ? cause.message : 'No se pudo consultar el pedido.' });
    });
    return () => controller.abort();
  }, [token, userId, orderId, valid, attempt, invalidateSession]);
  useEffect(() => { if (result?.error) error.current?.focus(); }, [result]);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const value = draftId.trim();
    if (!validOrderId(value)) { setFieldError('Escribe un ID de pedido entero mayor que cero.'); input.current?.focus(); return; }
    if (orderId === value) setAttempt((previous) => previous + 1);
    else navigate(`/orders/${value}?source=api`);
  }
  return <>
    <CustomerHeader catalogSource="api" cartItemCount={0} cartTo="/cart?source=api" homeTo="/catalog?source=api" contentHeadingId="order-heading" skipLabel="Saltar al detalle del pedido" />
    <main className="order-detail"><h1 id="order-heading" ref={heading} tabIndex={-1}>{title}</h1>
      <p>Consulta un pedido de tu cuenta usando el ID recibido al comprar. Esta pantalla no crea pedidos ni realiza cobros.</p>
      <form className="order-detail__lookup" onSubmit={submit} noValidate><label htmlFor="api-order-id">ID del pedido</label><input id="api-order-id" ref={input} value={draftId} inputMode="numeric" required disabled={loading} aria-invalid={Boolean(fieldError)} aria-describedby={fieldError ? 'api-order-id-error' : undefined} onChange={(event) => { setDraftId(event.currentTarget.value); setFieldError(''); }} />{fieldError && <p id="api-order-id-error" className="order-detail__error">{fieldError}</p>}<button type="submit" disabled={loading}>Consultar pedido</button></form>
      {!session ? <p><Link to="/login" state={{ returnTo: valid ? `/orders/${orderId}?source=api` : '/orders?source=api' }}>Inicia sesión para consultar tus pedidos</Link></p> : loading ? <p role="status">Consultando pedido…</p> : result?.error ? <section><p ref={error} tabIndex={-1} role="alert" className="order-detail__error">{result.error}</p><button type="button" className="order-detail__button" onClick={() => setAttempt((previous) => previous + 1)}>Reintentar consulta</button></section> : order ? <>
        <section className="order-detail__panel" aria-label="Datos del pedido"><p>Estado del servidor: {order.status}</p><p>Estado de reserva: {order.reservationState}</p><p>Fecha del servidor: {order.createdAt ? <time dateTime={order.createdAt}>{order.createdAt}</time> : 'No informada'}</p><p>Vencimiento informado: {order.reservationExpiresAt ? <time dateTime={order.reservationExpiresAt}>{order.reservationExpiresAt}</time> : 'No informado'}</p><p>Total confirmado: <strong>{currency.format(order.total)}</strong></p></section>
        <section className="order-detail__panel" aria-labelledby="api-order-products"><h2 id="api-order-products">Productos del pedido</h2>{order.items.length ? <ul className="order-detail__items">{order.items.map((item) => <li key={item.id}><h3>{item.name}</h3><p>Talla: {item.size} · Cantidad: {item.quantity}</p><p>Precio unitario registrado: {currency.format(item.unitPrice)}</p></li>)}</ul> : <p>El servidor no informó líneas de este pedido.</p>}<p>Datos históricos del pedido; no se sustituyen por precios del catálogo actual.</p></section>
        <section className="order-detail__panel" aria-labelledby="api-order-shipping"><h2 id="api-order-shipping">Envío informado</h2>{Object.values(order.shipping).some(Boolean) ? <><p>{order.shipping.address ?? 'Dirección no informada'}</p><p>{order.shipping.city ?? 'Ciudad no informada'} · {order.shipping.department ?? 'Departamento no informado'}</p><p>{order.shipping.phone ?? 'Teléfono no informado'}</p></> : <p>El servidor no informó datos de envío para este pedido.</p>}</section>
        <section className="order-detail__panel" aria-labelledby="api-order-payment"><h2 id="api-order-payment">Pago informado</h2>{order.payment ? <><p>Estado: {order.payment.status}</p><p>Método: {order.payment.method}</p><p>Importe: {currency.format(order.payment.amount)}</p></> : <p>El servidor no informó un registro de pago.</p>}</section>
        <p>Fechas tal como las informa el servidor, sin convertirlas como UTC. La consulta no cambia reservas, pedidos ni pagos.</p><button type="button" className="order-detail__button" onClick={() => setAttempt((previous) => previous + 1)}>Actualizar estado del pedido</button>
      </> : orderId ? <p>Este pedido no existe o no está disponible para tu cuenta.</p> : null}
      <nav className="order-detail__links" aria-label="Navegación del pedido"><Link to="/notifications?source=api">Volver a las notificaciones</Link><Link to="/catalog?source=api">Volver al catálogo</Link></nav>
    </main>
  </>;
}
