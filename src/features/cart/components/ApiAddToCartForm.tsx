import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useApiCart } from '../ApiCartContext';
import { cartQuantity } from '../cartApi';

export function ApiAddToCartForm({ productId, variants }: { productId: number; variants: readonly { size: string; available: number }[] }) {
  const { session } = useAuth();
  const cart = useApiCart();
  const [size, setSize] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const sizeRef = useRef<HTMLSelectElement>(null);
  const quantityRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (cart.busy) return;
    setMessage('');
    if (!size) { setError('Selecciona una talla.'); sizeRef.current?.focus(); return; }
    const count = cartQuantity(quantity);
    if (count === null || count > (variants.find((variant) => variant.size === size)?.available ?? 0)) { setError('Escribe una cantidad entera positiva dentro de la disponibilidad consultada.'); quantityRef.current?.focus(); return; }
    const result = await cart.change({ type: 'add', productId, size, quantity: count });
    setError(result.ok ? '' : result.message);
    setMessage(result.ok ? result.message : '');
    if (!result.ok) requestAnimationFrame(() => errorRef.current?.focus());
  }
  return <section className="cart-add" aria-label="Agregar producto al carrito real">
    <h2>Preparar tu selección</h2>
    {!session ? <p><Link to="/login" state={{ returnTo: `/catalog/${productId}?source=api` }}>Inicia sesión para agregar al carrito</Link></p> : cart.status === 'error' ? <><p ref={errorRef} tabIndex={-1} className="cart-add__error" role="alert">{cart.error}</p><button type="button" className="cart-add__submit" disabled={cart.busy} onClick={() => { void cart.refresh().then((result) => { setError(''); setMessage(result.ok ? 'Carrito consultado. Revisa su contenido antes de agregar otra vez.' : ''); }); }}>Consultar carrito antes de continuar</button><p><Link to="/cart?source=api">Ver carrito del servidor</Link></p></> : variants.some((variant) => variant.available > 0) ? <form onSubmit={(event) => { void submit(event); }} noValidate aria-busy={cart.busy}>
      <div className="cart-add__field"><label htmlFor="api-cart-size">Talla</label><select id="api-cart-size" ref={sizeRef} value={size} required disabled={cart.busy} onChange={(event) => { setSize(event.currentTarget.value); setError(''); setMessage(''); }} aria-invalid={Boolean(error && !size)} aria-describedby={error ? 'api-cart-add-error' : undefined}><option value="">Selecciona una talla</option>{variants.map((variant) => <option key={variant.size} value={variant.size} disabled={variant.available === 0}>{variant.size}{variant.available === 0 ? ' — Sin disponibilidad' : ''}</option>)}</select></div>
      <div className="cart-add__field"><label htmlFor="api-cart-quantity">Cantidad</label><input id="api-cart-quantity" ref={quantityRef} inputMode="numeric" value={quantity} required disabled={cart.busy} onChange={(event) => { setQuantity(event.currentTarget.value); setError(''); setMessage(''); }} aria-invalid={Boolean(error && size)} aria-describedby={error ? 'api-cart-add-error' : undefined} /></div>
      {error && <p id="api-cart-add-error" ref={errorRef} tabIndex={-1} role="alert" className="cart-add__error">{error}</p>}
      <button type="submit" className="cart-add__submit" disabled={cart.busy}>{cart.busy ? 'Actualizando carrito…' : 'Agregar al carrito'}</button>
    </form> : <p>No hay tallas con disponibilidad confirmada para agregar al carrito.</p>}
    <p role="status" aria-atomic="true">{message}</p>
    <p>Agregar no reserva ni descuenta existencias. El servidor confirma cantidades e importes.</p>
  </section>;
}
