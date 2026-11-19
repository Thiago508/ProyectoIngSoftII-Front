import { useEffect, useId, useRef, useState, type FormEvent } from 'react';

interface CartLineControlsProps {
  quantity: number;
  name: string;
  size: string;
  active: boolean;
  disabled?: boolean;
  onUpdate: (quantity: string) => { ok: boolean; message: string } | Promise<{ ok: boolean; message: string }>;
  onRemove: () => { ok: boolean; message: string } | Promise<{ ok: boolean; message: string }>;
}

export function CartLineControls({ quantity, name, size, active, disabled = false, onUpdate, onRemove }: CartLineControlsProps) {
  const id = useId();
  const [draft, setDraft] = useState(String(quantity));
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const label = `${name}, talla ${size}`;

  useEffect(() => { if (error && !busy && !disabled) inputRef.current?.focus(); }, [error, busy, disabled]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || disabled) return;
    pending.current = true; setBusy(true);
    const result = await onUpdate(draft);
    pending.current = false; setBusy(false);
    setError(result.ok ? '' : result.message);
    if (result.ok) setDraft(String(Number(draft)));
    else inputRef.current?.focus();
  }

  async function remove() {
    if (pending.current || disabled) return;
    pending.current = true; setBusy(true);
    const result = await onRemove();
    pending.current = false; setBusy(false);
    if (!result.ok) setError(result.message);
  }

  return <div className="cart-line-controls">
    <form onSubmit={(event) => { void submit(event); }} aria-label={`Modificar cantidad de ${label}`} noValidate>
      <label htmlFor={id}>Cantidad de {label}</label>
      <div className="cart-line-controls__row">
        <input id={id} ref={inputRef} type="text" inputMode="numeric" value={draft} required disabled={!active || disabled || busy} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} onChange={(event) => { setDraft(event.currentTarget.value); setError(''); }} />
        <button type="submit" className="cart-add__submit" disabled={!active || disabled || busy} aria-label={`Guardar cantidad de ${label}`}>Actualizar cantidad</button>
      </div>
      {error && <p id={`${id}-error`} className="cart-add__error" role="alert">{error}</p>}
      {draft !== String(quantity) && <button type="button" disabled={disabled || busy} className="cart-line-controls__secondary" onClick={() => { setDraft(String(quantity)); setError(''); inputRef.current?.focus(); }}>Descartar cambio de cantidad</button>}
    </form>
    <button type="button" className="cart-line-controls__secondary" aria-label={`Retirar ${label}`} disabled={disabled || busy} onClick={() => { void remove(); }}>Retirar artículo</button>
  </div>;
}
