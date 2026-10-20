import { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CustomerHeader } from '../../shared/components/CustomerHeader/CustomerHeader';
import type { DemoOrder } from '../checkout/types/checkout.types';
import './OrderDetailPage.css';

const currency = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 2 });
const dateTime = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' });

export function OrderDetailPage({ orders, cartCount }: { orders: readonly DemoOrder[]; cartCount: number }) {
  const { orderId } = useParams<{ orderId: string }>();
  const order = orders.find((candidate) => candidate.id === orderId);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
    const previousTitle = document.title;
    document.title = `${order ? 'Detalle del pedido' : 'Pedido no disponible'} | Fashion Online Store`;
    return () => { document.title = previousTitle; };
  }, [orderId, order]);

  return <>
    <CustomerHeader cartItemCount={cartCount} cartTo="/cart" homeTo="/catalog" contentHeadingId="order-heading" skipLabel="Saltar al detalle del pedido" />
    <main className="order-detail">
      <h1 id="order-heading" ref={headingRef} tabIndex={-1}>{order ? 'Detalle del pedido' : 'Pedido no disponible'}</h1>
      {order ? <>
        <p>Pedido de demostración conservado en memoria, sin cuenta autenticada. Recargar elimina este detalle.</p>
        <section className="order-detail__panel" aria-label="Datos del pedido">
          <p>Referencia: {order.id}</p>
          <p>Estado: pendiente de pago.</p>
          <p>Fecha: <time dateTime={order.createdAt}>{dateTime.format(new Date(order.createdAt))}</time> (hora de Colombia)</p>
          <p>No se ha realizado ningún cobro ni descontado inventario.</p>
        </section>
        <section className="order-detail__panel" aria-labelledby="order-products-heading">
          <h2 id="order-products-heading">Productos del pedido</h2>
          <ul className="order-detail__items">
            {order.items.map((item) => <li key={item.id}>
              <h3>{item.name}</h3>
              <p>Talla: {item.size} · Cantidad: {item.quantity}</p>
              <p>Precio unitario: {currency.format(item.unitPrice)}</p>
              <p>Subtotal de la línea: {currency.format(Math.round(item.unitPrice * 100) * item.quantity / 100)}</p>
            </li>)}
          </ul>
          <p><strong>Subtotal de productos: {currency.format(order.subtotal)}</strong></p>
          <p>Envío no incluido. Los nombres y precios corresponden al momento de crear este pedido de demostración.</p>
        </section>
        <section className="order-detail__panel" aria-labelledby="order-shipping-heading">
          <h2 id="order-shipping-heading">Datos y envío</h2>
          <p>{order.customer.fullName}<br />{order.customer.email}<br />{order.customer.phone}</p>
          <p>{order.customer.address}<br />{order.customer.city}, {order.customer.department}</p>
        </section>
      </> : <p>Este pedido no está disponible en la sesión de demostración. Los pedidos locales se pierden al recargar.</p>}
      <nav className="order-detail__links" aria-label="Navegación del pedido">
        <Link to="/notifications">Volver a las notificaciones</Link>
        <Link to="/catalog">Volver al catálogo</Link>
      </nav>
    </main>
  </>;
}
