import { useId, useRef, useState, type FormEvent } from 'react';

interface CartLineControlsProps {
  quantity: number;
  name: string;
  size: string;
  active: boolean;
  onUpdate: (quantity: string) => { ok: boolean; message: string };
  onRemove: () => { ok: boolean; message: string };
}

export function CartLineControls({ quantity, name, size, active, onUpdate, onRemove }: CartLineControlsProps) {
  const id = useId();
  const [draft, setDraft] = useState(String(quantity));
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const label = `${name}, talla ${size}`;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = onUpdate(draft);
    setError(result.ok ? '' : result.message);
    if (result.ok) setDraft(String(Number(draft)));
    else inputRef.current?.focus();
  }

  return <div className="cart-line-controls">
    <form onSubmit={submit} aria-label={`Modificar cantidad de ${label}`} noValidate>
      <label htmlFor={id}>Cantidad de {label}</label>
      <div className="cart-line-controls__row">
        <input id={id} ref={inputRef} type="text" inputMode="numeric" value={draft} required disabled={!active} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} onChange={(event) => { setDraft(event.currentTarget.value); setError(''); }} />
        <button type="submit" className="cart-add__submit" disabled={!active} aria-label={`Guardar cantidad de ${label}`}>Actualizar cantidad</button>
      </div>
      {error && <p id={`${id}-error`} className="cart-add__error" role="alert">{error}</p>}
      {draft !== String(quantity) && <button type="button" className="cart-line-controls__secondary" onClick={() => { setDraft(String(quantity)); setError(''); inputRef.current?.focus(); }}>Descartar cambio de cantidad</button>}
    </form>
    <button type="button" className="cart-line-controls__secondary" aria-label={`Retirar ${label}`} onClick={() => { const result = onRemove(); if (!result.ok) setError(result.message); }}>Retirar artículo</button>
  </div>;
}
