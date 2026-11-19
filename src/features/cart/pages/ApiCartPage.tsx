import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useApiCart } from '../ApiCartContext';
import { cartQuantity } from '../cartApi';
import { CustomerHeader } from '../../../shared/components/CustomerHeader/CustomerHeader';
import { CartLineControls } from '../components/CartLineControls';
import './CartPage.css';

const currency = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2, maximumFractionDigits: 2 });
export function ApiCartPage() {
  const auth = useAuth();
  const api = useApiCart();
  const [message, setMessage] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const focusIndex = useRef<number | null>(null);
  useEffect(() => {
    heading.current?.focus();
    const title = document.title;
    document.title = 'Carrito | Fashion Online Store';
    return () => { document.title = title; };
  }, []);
  useEffect(() => { if (auth.session && api.status === 'idle') void api.refresh(); }, [api, auth.session]);
  useEffect(() => { if (api.status === 'error') errorRef.current?.focus(); }, [api.status]);
  useEffect(() => {
    if (api.busy || focusIndex.current === null || api.status !== 'ready') return;
    const headings = list.current?.querySelectorAll<HTMLElement>('h2');
    (headings?.[Math.min(focusIndex.current, headings.length - 1)] ?? heading.current)?.focus();
    focusIndex.current = null;
  }, [api, message]);
  return <>
    <CustomerHeader catalogSource="api" cartItemCount={0} cartTo="/cart?source=api" homeTo="/catalog?source=api" contentHeadingId="cart-heading" skipLabel="Saltar al carrito" />
    <main className="cart-page"><h1 id="cart-heading" tabIndex={-1} ref={heading}>Tu carrito</h1>
      <p>Carrito de tu cuenta en el servidor. Agregar artículos no reserva ni descuenta existencias.</p>
      {!auth.session ? <p><Link to="/login" state={{ returnTo: '/cart?source=api' }}>Inicia sesión para consultar tu carrito</Link></p> : <>
        {(api.status === 'idle' || api.status === 'loading') && <p role="status">Consultando carrito…</p>}
        {api.status === 'error' && <section aria-label="Error del carrito"><p ref={errorRef} tabIndex={-1} className="cart-add__error" role="alert">{api.error}</p><button type="button" className="cart-line-controls__secondary" disabled={api.busy} onClick={() => { focusIndex.current = 0; void api.refresh(); }}>Consultar carrito</button></section>}
        {api.status === 'ready' && api.cart && <div aria-busy={api.busy}>
          {!api.cart.items.length ? <p>Tu carrito está vacío. Explora el catálogo para agregar productos.</p> : <ul ref={list} className="cart-page__items cart-page__items--server" aria-label="Productos del carrito">{api.cart.items.map((item, index) => <li key={`${item.productId}-${item.size}`}><div>
            <h2 tabIndex={-1}>{item.name}</h2><p>Talla: {item.size} · Cantidad: {item.quantity}</p><p>Precio unitario: {currency.format(item.unitPriceCents / 100)}</p><p>Subtotal de la línea: {currency.format(item.subtotalCents / 100)}</p>
            {!item.active && <p className="cart-add__error">Producto inactivo. Puedes retirarlo del carrito.</p>}
            <CartLineControls key={`${item.productId}-${item.size}-${item.quantity}`} quantity={item.quantity} name={item.name} size={item.size} active={item.active} disabled={api.busy}
              onUpdate={async (value) => { const quantity = cartQuantity(value); if (quantity === null) return { ok: false, message: 'Escribe una cantidad entera mayor que cero.' }; const result = await api.change({ type: 'update', productId: item.productId, size: item.size, quantity }); if (result.ok) { focusIndex.current = index; setMessage(result.message); } return result; }}
              onRemove={async () => { const result = await api.change({ type: 'remove', productId: item.productId, size: item.size }); if (result.ok) { focusIndex.current = index; setMessage(result.message); } return result; }} />
          </div></li>)}</ul>}
          <p className="cart-page__subtotal">Subtotal de productos: {currency.format(api.cart.subtotalCents / 100)}</p>
          <p>El pedido se crea después de revisar la selección; no se realiza un cobro al crearlo.</p>
          {api.cart.items.length > 0 && <p><Link className="cart-page__checkout" to="/checkout/review?source=api">Continuar con la compra</Link></p>}
          <button type="button" className="cart-line-controls__secondary" disabled={api.busy} onClick={() => { focusIndex.current = 0; void api.refresh(); setMessage(''); }}>Actualizar carrito</button>
        </div>}
        <p role="status" aria-atomic="true">{api.busy && api.status === 'ready' ? 'Actualizando carrito…' : message}</p>
      </>}
      <p><Link to="/orders?source=api">Consultar un pedido por ID</Link></p>
      <p><Link to="/catalog?source=api">Seguir explorando el catálogo</Link></p>
      <p><Link to="/cart?source=demo">Ver carrito de demostración</Link></p>
    </main>
  </>;
}
