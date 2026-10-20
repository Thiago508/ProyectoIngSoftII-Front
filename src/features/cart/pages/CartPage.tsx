import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { CustomerHeader } from '../../../shared/components/CustomerHeader/CustomerHeader';
import { ProductPhoto } from '../../../shared/components/ProductPhoto/ProductPhoto';
import type { Product } from '../../products/demo/productsDemo';
import { cartSubtotalCents, type CartLine } from '../cart';
import './CartPage.css';

const currency = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function CartPage({ lines, products }: { lines: readonly CartLine[]; products: readonly Product[] }) {
  let subtotal: number | null = null;
  try { subtotal = cartSubtotalCents(lines, products); } catch { /* Se muestra un estado recuperable si los datos del catálogo cambian. */ }
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
    const previousTitle = document.title;
    document.title = 'Carrito | Fashion Online Store';
    return () => { document.title = previousTitle; };
  }, []);
  return <>
    <CustomerHeader cartItemCount={lines.reduce((sum, line) => sum + line.quantity, 0)} cartTo="/cart" homeTo="/catalog" contentHeadingId="cart-heading" skipLabel="Saltar al carrito" />
    <main className="cart-page">
      <h1 id="cart-heading" ref={headingRef} tabIndex={-1}>Tu carrito</h1>
      <p>Selección de demostración en memoria. No reserva inventario y se pierde al recargar. Todavía no está conectada con el carrito simulado del checkout.</p>
      {!lines.length ? <p>Tu carrito está vacío. Explora el catálogo para agregar productos.</p> : <ul className="cart-page__items" aria-label="Productos del carrito">
        {lines.map((line) => {
          const product = products.find((candidate) => candidate.id === line.productId);
          return <li key={`${line.productId}-${line.sku}`}>
            <ProductPhoto photo={product?.image} />
            <div><h2>{product?.name ?? 'Producto no disponible'}</h2><p>SKU: {line.sku} · Talla: {line.size}</p><p>Cantidad: {line.quantity}</p>
              {product && <><p>Precio unitario: {currency.format(product.priceCents / 100)}</p><p>Subtotal de la línea: {currency.format(product.priceCents * line.quantity / 100)}</p></>}
              {!product?.active && <p className="cart-add__error">Producto inactivo o no disponible. No es válido para una nueva compra.</p>}
            </div>
          </li>;
        })}
      </ul>}
      {subtotal === null ? <p role="alert" className="cart-add__error">No se puede calcular el subtotal con los datos actuales. Revisa los artículos del carrito.</p> : <p className="cart-page__subtotal">Subtotal de productos: {currency.format(subtotal / 100)}</p>}
      <p>Envío no incluido. Precios informativos del catálogo local; el importe definitivo corresponde al servidor.</p>
      <Link to="/catalog">Seguir explorando el catálogo</Link>
    </main>
  </>;
}
