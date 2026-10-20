import { useRef, useState, type FormEvent } from 'react';
import type { DemoAvailability } from '../../catalog/demo/catalogDemo';

interface AddToCartFormProps {
  variants: readonly DemoAvailability[];
  onAdd: (sku: string, quantity: string) => { ok: boolean; message: string };
}

export function AddToCartForm({ variants, onAdd }: AddToCartFormProps) {
  const [sku, setSku] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const selectRef = useRef<HTMLSelectElement>(null);
  const quantityRef = useRef<HTMLInputElement>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    if (!sku) { setError('Selecciona una talla.'); selectRef.current?.focus(); return; }
    const result = onAdd(sku, quantity);
    setError(result.ok ? '' : result.message);
    setMessage(result.ok ? result.message : '');
    if (!result.ok) quantityRef.current?.focus();
  }

  return <section className="cart-add" aria-label="Agregar producto al carrito">
    <h2>Preparar tu selección</h2>
    {variants.some((variant) => variant.available > 0) ? <form onSubmit={submit} noValidate>
      <div className="cart-add__field"><label htmlFor="cart-size">Talla</label>
        <select ref={selectRef} id="cart-size" value={sku} required aria-invalid={Boolean(error && !sku)} aria-describedby={error ? 'cart-add-error' : undefined} onChange={(event) => { setSku(event.currentTarget.value); setError(''); setMessage(''); }}>
          <option value="">Selecciona una talla</option>
          {variants.map((variant) => <option value={variant.sku} key={variant.sku} disabled={variant.available === 0}>{variant.size}{variant.available === 0 ? ' — Sin disponibilidad' : ''}</option>)}
        </select>
      </div>
      <div className="cart-add__field"><label htmlFor="cart-quantity">Cantidad</label>
        <input ref={quantityRef} id="cart-quantity" type="text" inputMode="numeric" value={quantity} required aria-invalid={Boolean(error && sku)} aria-describedby={error ? 'cart-add-error' : undefined} onChange={(event) => { setQuantity(event.currentTarget.value); setError(''); setMessage(''); }} />
      </div>
      {error && <p className="cart-add__error" id="cart-add-error" role="alert">{error}</p>}
      <button type="submit" className="cart-add__submit">Agregar al carrito</button>
    </form> : <p>No hay tallas con disponibilidad confirmada en esta demostración para agregar al carrito.</p>}
    <p role="status" aria-atomic="true">{message}</p>
    <p>Agregar no reserva ni descuenta existencias. La disponibilidad definitiva se comprobará al confirmar el pedido.</p>
  </section>;
}
