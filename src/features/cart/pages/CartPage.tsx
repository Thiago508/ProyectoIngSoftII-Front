import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CustomerHeader } from '../../../shared/components/CustomerHeader/CustomerHeader';
import { ProductPhoto } from '../../../shared/components/ProductPhoto/ProductPhoto';
import type { Product } from '../../products/demo/productsDemo';
import { CartLineControls } from '../components/CartLineControls';
import { cartSubtotalCents, type CartLine } from '../cart';
import './CartPage.css';

const currency = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function CartPage({ lines, products, onUpdate, onRemove }: {
  lines: readonly CartLine[]; products: readonly Product[];
  onUpdate: (productId: string, sku: string, quantity: string) => { ok: boolean; message: string };
  onRemove: (productId: string, sku: string) => { ok: boolean; message: string };
}) {
  let subtotal: number | null = null;
  try { subtotal = cartSubtotalCents(lines, products); } catch { /* Se muestra un estado recuperable si los datos del catálogo cambian. */ }
  const [status, setStatus] = useState('');
  const listRef = useRef<HTMLUListElement>(null);
  const pendingFocusIndex = useRef<number | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
    const previousTitle = document.title;
    document.title = 'Carrito | Fashion Online Store';
    return () => { document.title = previousTitle; };
  }, []);
  useEffect(() => {
    if (pendingFocusIndex.current === null) return;
    const headings = listRef.current?.querySelectorAll<HTMLElement>('h2');
    const target = headings?.[Math.min(pendingFocusIndex.current, (headings?.length ?? 0) - 1)];
    (target ?? headingRef.current)?.focus();
    pendingFocusIndex.current = null;
  }, [lines]);

  function update(productId: string, sku: string, quantity: string) {
    const result = onUpdate(productId, sku, quantity);
    setStatus(result.ok ? result.message : '');
    return result;
  }

  function remove(productId: string, sku: string) {
    const index = lines.findIndex((line) => line.productId === productId && line.sku === sku);
    const result = onRemove(productId, sku);
    if (result.ok) pendingFocusIndex.current = index;
    setStatus(result.ok ? result.message : '');
    return result;
  }

  return <>
    <CustomerHeader cartItemCount={lines.reduce((sum, line) => sum + line.quantity, 0)} cartTo="/cart" homeTo="/catalog" contentHeadingId="cart-heading" skipLabel="Saltar al carrito" />
    <main className="cart-page">
      <h1 id="cart-heading" ref={headingRef} tabIndex={-1}>Tu carrito</h1>
      <p>Selección de demostración en memoria. No reserva inventario y se pierde al recargar. Todavía no está conectada con el carrito simulado del checkout.</p>
      {!lines.length ? <p>Tu carrito está vacío. Explora el catálogo para agregar productos.</p> : <ul ref={listRef} className="cart-page__items" aria-label="Productos del carrito">
        {lines.map((line) => {
          const product = products.find((candidate) => candidate.id === line.productId);
          return <li key={`${line.productId}-${line.sku}`}>
            <ProductPhoto photo={product?.image} />
            <div><h2 tabIndex={-1}>{product?.name ?? 'Producto no disponible'}</h2><p>SKU: {line.sku} · Talla: {line.size}</p><p>Cantidad: {line.quantity}</p>
              {product && <><p>Precio unitario: {currency.format(product.priceCents / 100)}</p><p>Subtotal de la línea: {currency.format(product.priceCents * line.quantity / 100)}</p></>}
              <CartLineControls quantity={line.quantity} name={product?.name ?? 'Producto no disponible'} size={line.size} active={Boolean(product?.active)} onUpdate={(quantity) => update(line.productId, line.sku, quantity)} onRemove={() => remove(line.productId, line.sku)} />
              {!product?.active && <p className="cart-add__error">Producto inactivo o no disponible. No es válido para una nueva compra.</p>}
            </div>
          </li>;
        })}
      </ul>}
      <p role="status" aria-atomic="true">{status}</p>
      {subtotal === null ? <p role="alert" className="cart-add__error">No se puede calcular el subtotal con los datos actuales. Revisa los artículos del carrito.</p> : <p className="cart-page__subtotal">Subtotal de productos: {currency.format(subtotal / 100)}</p>}
      <p>Envío no incluido. Precios informativos del catálogo local; el importe definitivo corresponde al servidor.</p>
      <Link to="/catalog">Seguir explorando el catálogo</Link>
    </main>
  </>;
}
