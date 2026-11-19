import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useApiCart } from '../../cart/ApiCartContext';
import type { ApiCart } from '../../cart/cartApi';
import { useOrderCreation } from '../../orders/OrderCreationContext';
import { OrderShippingForm } from './OrderShippingForm';
import { validateOrderShipping, type ShippingErrors } from '../../orders/orderShipping';
import { orderItems } from '../../orders/createApiOrder';
import { CustomerHeader } from '../../../shared/components/CustomerHeader/CustomerHeader';
import '../../orders/OrderDetailPage.css';
const currency = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
export function ApiCheckoutPage() {
  const { session } = useAuth();
  return <ReviewCheckout key={session?.accessToken ?? 'anonymous'} />;
}
function ReviewCheckout() {
  const { session } = useAuth();
  const cart = useApiCart();
  const creation = useOrderCreation();
  const [reviewedCart, setReviewedCart] = useState<ApiCart | null>(null);
  const [shippingErrors, setShippingErrors] = useState<ShippingErrors>({});
  const heading = useRef<HTMLHeadingElement>(null);
  const error = useRef<HTMLParagraphElement>(null);
  const fetched = useRef(false);
  const refreshedOrder = useRef<number | null>(null);
  let validation = '';
  if (cart.cart) { try { orderItems(cart.cart); } catch (cause) { validation = cause instanceof Error ? cause.message : 'Revisa el carrito.'; } }
  const title = creation.phase === 'created' ? 'Pedido recibido' : creation.phase === 'uncertain' ? 'Resultado de creación sin confirmar' : 'Revisar compra';
  useEffect(() => {
    heading.current?.focus(); const previous = document.title; document.title = `${title} | Fashion Online Store`;
    return () => { document.title = previous; };
  }, [title]);
  useEffect(() => { if (session && !fetched.current) { fetched.current = true; void cart.refresh(); } }, [cart, session]);
  useEffect(() => { if (creation.phase === 'created' && creation.order && refreshedOrder.current !== creation.order.id) { refreshedOrder.current = creation.order.id; void cart.refresh(); } }, [cart, creation.phase, creation.order]);
  useEffect(() => { if (creation.error && creation.phase !== 'submitting') error.current?.focus(); }, [creation.error, creation.phase]);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (cart.busy || creation.phase !== 'idle' || !cart.cart || reviewedCart !== cart.cart || validation) return;
    const errors = validateOrderShipping(creation.shipping); setShippingErrors(errors);
    if (!Object.keys(errors).length) void creation.create(cart.cart);
  }
  const blocked = cart.busy || cart.status !== 'ready' || !cart.cart || Boolean(validation) || creation.phase !== 'idle' || reviewedCart !== cart.cart;
  return <>
    <CustomerHeader catalogSource="api" cartItemCount={0} cartTo="/cart?source=api" homeTo="/catalog?source=api" contentHeadingId="checkout-heading" skipLabel="Saltar a la revisión de compra" />
    <main className="order-detail"><h1 id="checkout-heading" ref={heading} tabIndex={-1}>{title}</h1>
      {!session ? <p><Link to="/login" state={{ returnTo: '/checkout/review?source=api' }}>Inicia sesión para revisar tu compra</Link></p> : <>
        {creation.error && <p role="alert" ref={error} tabIndex={-1} className="order-detail__error">{creation.error}</p>}
        {creation.phase === 'created' && creation.order ? <section className="order-detail__panel" aria-labelledby="created-order-heading"><h2 id="created-order-heading">Pedido #{creation.order.id}</h2><p>Estado del servidor: {creation.order.status}</p><p>Reserva: {creation.order.reservationState}</p><p>Total confirmado: {currency.format(creation.order.total)}</p><p>Vencimiento informado: {creation.order.reservationExpiresAt ?? 'No informado'}</p><p>Crear el pedido no realiza un cobro. Consulta su detalle para revisar la reserva y el pago que informe el servidor.</p><p><Link to={`/orders/${creation.order.id}?source=api`}>Ver pedido #{creation.order.id}</Link></p><p><Link to={`/orders/${creation.order.id}/payment?source=api`}>Continuar al pago de prueba</Link></p><button type="button" className="order-detail__button" disabled={cart.busy} onClick={() => { void cart.refresh().then((result) => { if (result.ok) { setReviewedCart(null); creation.prepareAnother(); } }); }}>Preparar otro pedido</button></section> : creation.phase === 'uncertain' ? <section className="order-detail__panel" aria-label="Recuperar resultado de creación"><p>Hay una solicitud de creación sin confirmar en esta pestaña. No la reenvíes: podría haber creado un pedido y reservado unidades.</p>{creation.reference !== null ? <><p>Referencia recibida: {creation.reference}</p><button className="order-detail__button" type="button" disabled={creation.recovering} onClick={() => { void creation.recover(); }}>{creation.recovering ? 'Consultando pedido…' : 'Consultar pedido recibido'}</button></> : <><p>No tenemos un ID confirmado para recuperar automáticamente el pedido. Revisa tus notificaciones o consulta con el equipo de la tienda antes de repetir la compra.</p><p><Link to="/notifications?source=api">Consultar notificaciones</Link></p><p><Link to="/orders?source=api">Consultar un pedido por ID</Link></p></>}</section> : <>
          <section className="order-detail__panel"><h2>Cuenta de la compra</h2><p>{session.user.name}<br />{session.user.email}</p><p>El pedido se asocia a tu cuenta. Nombre y correo pertenecen a tu perfil.</p></section>
          <section className="order-detail__panel" aria-labelledby="order-shipping-heading"><h2 id="order-shipping-heading">Datos de envío</h2><OrderShippingForm value={creation.shipping} errors={shippingErrors} disabled={cart.busy || creation.phase !== 'idle'} onChange={(next) => { creation.setShipping(next); setShippingErrors({}); setReviewedCart(null); }} onSubmit={submit} /><p>Estos datos se conservan entre rutas durante esta sesión; no se guardan en el almacenamiento del navegador.</p></section>
          {cart.status === 'idle' || cart.status === 'loading' ? <p role="status">Consultando carrito para revisar la compra…</p> : cart.status === 'error' ? <p role="alert" className="order-detail__error">{cart.error}</p> : cart.cart ? <section className="order-detail__panel" aria-labelledby="checkout-items-heading"><h2 id="checkout-items-heading">Productos que vas a pedir</h2><ul className="order-detail__items">{cart.cart.items.map((item) => <li key={JSON.stringify([item.productId, item.size])}><h3>{item.name}</h3><p>Talla: {item.size} · Cantidad: {item.quantity}</p><p>Precio unitario consultado: {currency.format(item.unitPriceCents / 100)}</p></li>)}</ul><p>Subtotal consultado: {currency.format(cart.cart.subtotalCents / 100)}</p><p>El servidor confirma el total y la disponibilidad al crear el pedido. Cada línea admite de 1 a 20 unidades.</p>{validation && <p role="alert" className="order-detail__error">{validation}</p>}</section> : null}
          {creation.phase === 'rejected' ? <><p>La solicitud fue rechazada. Consulta el carrito antes de revisar e intentar de nuevo.</p><button className="order-detail__button" type="button" disabled={cart.busy} onClick={() => { void cart.refresh().then((result) => { if (result.ok) { setReviewedCart(null); creation.prepareAnother(); } }); }}>Actualizar carrito para revisar de nuevo</button></> : <>
            <p><label><input type="checkbox" checked={Boolean(cart.cart && reviewedCart === cart.cart)} disabled={cart.busy || creation.phase === 'submitting' || Boolean(validation) || cart.status !== 'ready'} onChange={(event) => setReviewedCart(event.currentTarget.checked ? cart.cart : null)} /> Revisé los productos, tallas, cantidades y datos de envío.</label></p>
            <button type="submit" form="order-shipping-form" className="order-detail__button" disabled={blocked}>{creation.phase === 'submitting' ? 'Creando pedido…' : 'Crear pedido pendiente de pago'}</button>
          </>}
          <p role="status" aria-atomic="true">{creation.phase === 'submitting' ? 'Esperando la confirmación del servidor. No repitas la solicitud.' : ''}</p>
          {cart.status === 'error' && <button type="button" className="order-detail__button" disabled={cart.busy} onClick={() => { void cart.refresh(); }}>Consultar carrito</button>}
        </>}
      </>}
      <nav className="order-detail__links" aria-label="Navegación de compra"><Link to="/cart?source=api">Volver al carrito</Link><Link to="/catalog?source=api">Volver al catálogo</Link></nav>
    </main>
  </>;
}
