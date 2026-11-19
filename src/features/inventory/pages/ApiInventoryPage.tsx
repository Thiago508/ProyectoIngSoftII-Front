import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AdminHeader } from '../../../shared/components/AdminHeader/AdminHeader';
import { ApiError, createApiClient } from '../../../shared/api/apiClient';
import { getApiBaseUrl } from '../../../shared/api/apiConfig';
import { useAuth } from '../../auth/AuthContext';
import { listApiProducts, type AdminProduct } from '../../products/productsApi';
import { adjustApiInventory, emptyInventoryDraft, inventoryFieldErrors, listApiInventory, validateInventoryDraft, type ApiInventoryRow, type InventoryDraft, type InventoryErrors } from '../inventoryApi';
import './InventoryPage.css';

export function ApiInventoryPage() {
  const { session, invalidateSession } = useAuth();
  const token = session?.accessToken;
  const [rows, setRows] = useState<ApiInventoryRow[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [draft, setDraft] = useState<InventoryDraft>(emptyInventoryDraft);
  const [errors, setErrors] = useState<InventoryErrors>({});
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(true);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Consultando inventario…');
  const pending = useRef<AbortController | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const focusRow = useRef<{ productId: number; size: string } | null>(null);
  const table = useRef<HTMLTableElement>(null);
  const productIds = [...new Set([...products.map((product) => product.id), ...rows.map((row) => row.productId)])];
  const sizes = [...new Set([...(products.find((product) => String(product.id) === draft.productId)?.sizes ?? []), ...rows.filter((row) => String(row.productId) === draft.productId).map((row) => row.size)])];
  const selected = rows.find((row) => String(row.productId) === draft.productId && row.size === draft.size.trim());
  const name = (id: number) => products.find((product) => product.id === id)?.name ?? `Producto #${id}`;

  useEffect(() => {
    heading.current?.focus();
    const previous = document.title; document.title = 'Inventario | Fashion Online Store';
    return () => { document.title = previous; };
  }, []);
  const read = useCallback((recover = false) => {
    if (pending.current || !token) return Promise.resolve();
    const controller = new AbortController(); pending.current = controller;
    return Promise.resolve().then(() => {
      const base = getApiBaseUrl(); const client = createApiClient(base);
      return Promise.all([listApiInventory(client, token, controller.signal), listApiProducts(client, base, controller.signal)]);
    }).then(([inventory, metadata]) => {
      if (controller.signal.aborted) return;
      setRows(inventory); setProducts(metadata); setLoaded(true); setUncertain(false);
      if (recover) { setDraft(emptyInventoryDraft); setErrors({}); }
      setStatus('Inventario consultado.');
    }, (cause: unknown) => {
      if (controller.signal.aborted) return;
      controller.abort(); // Cancelar la otra lectura cuando falla una de las dos consultas.
      if (cause instanceof ApiError && cause.status === 401) invalidateSession(token);
      setLoaded(false); setStatus('');
      setError(cause instanceof ApiError && cause.status === 403 ? 'No tienes permiso para consultar el inventario.' : cause instanceof Error ? cause.message : 'No se pudo consultar el inventario.');
    }).finally(() => { if (pending.current === controller) { pending.current = null; setBusy(false); } });
  }, [token, invalidateSession]);
  useEffect(() => {
    void read();
    return () => { pending.current?.abort(); pending.current = null; };
  }, [read]);
  useEffect(() => {
    if (busy) return;
    if (error) {
      const field = (['productId', 'size', 'quantity', 'reason'] as const).find((field) => errors[field]);
      (field ? form.current?.querySelector<HTMLElement>(`[name="${field}"]`) : errorRef.current)?.focus();
    } else if (focusRow.current) {
      const target = Array.from(table.current?.querySelectorAll<HTMLElement>('[data-inventory-row]') ?? []).find((row) => row.dataset.productId === String(focusRow.current?.productId) && row.dataset.size === focusRow.current?.size);
      (target ?? heading.current)?.focus(); focusRow.current = null;
    }
  }, [busy, error, errors, rows]);

  function fieldChange(field: keyof InventoryDraft, value: string) {
    setDraft((previous) => field === 'productId' ? { productId: value, size: '', quantity: '', reason: '' } : { ...previous, [field]: value });
    setErrors((previous) => field === 'productId' ? {} : { ...previous, [field]: undefined }); setError(''); setStatus('');
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || !token || !loaded || uncertain) return;
    const next = validateInventoryDraft(draft, rows, productIds); setErrors(next);
    if (Object.keys(next).length) { setError('Revisa los campos del ajuste.'); return; }
    const controller = new AbortController(); pending.current = controller;
    setBusy(true); setError(''); setStatus('Guardando ajuste en el servidor…');
    try {
      const row = await adjustApiInventory(createApiClient(getApiBaseUrl()), token, controller.signal, draft);
      if (controller.signal.aborted) return;
      setRows((previous) => previous.some((item) => item.productId === row.productId && item.size === row.size) ? previous.map((item) => item.productId === row.productId && item.size === row.size ? row : item) : [...previous, row]);
      setDraft((previous) => ({ ...previous, quantity: String(row.quantity), reason: '' })); setErrors({}); focusRow.current = { productId: row.productId, size: row.size };
      setStatus(`Ajuste confirmado: talla ${row.size}, físico ${row.quantity}, reservado ${row.reserved}, disponible ${row.available}.`);
    } catch (cause: unknown) {
      if (controller.signal.aborted) return;
      if (cause instanceof ApiError && cause.status === 401) invalidateSession(token);
      const unknown = !(cause instanceof ApiError) || cause.kind !== 'http' || (cause.status ?? 500) >= 500;
      setUncertain(unknown); setErrors(inventoryFieldErrors(cause)); setStatus('');
      const message = cause instanceof ApiError && cause.status === 403 ? 'No tienes permiso para ajustar inventario.' : cause instanceof Error ? cause.message : 'No se pudo guardar el ajuste.';
      setError(unknown ? `${message} El ajuste podría haberse aplicado. Consulta el inventario antes de volver a guardar.` : message);
    } finally { if (pending.current === controller) pending.current = null; if (!controller.signal.aborted) setBusy(false); }
  }
  const disabled = busy || !loaded || uncertain;
  return <div className="inventory-page">
    <a className="inventory-page__skip" href="#inventory-heading">Saltar al inventario</a><AdminHeader />
    <main className="inventory-page__main"><h1 id="inventory-heading" tabIndex={-1} ref={heading}>Inventario</h1>
      <p className="inventory-page__notice">Inventario del servidor por producto y talla. El ajuste establece existencias físicas; las reservas y la disponibilidad son confirmadas por el backend.</p>
      <p><Link to="/admin/inventory?source=demo">Ver inventario de demostración</Link></p>
      <button type="button" className="inventory-page__secondary" disabled={busy} onClick={() => { setBusy(true); setError(''); setStatus('Consultando inventario…'); void read(uncertain); }}>Consultar inventario</button>
      <p role="status" aria-atomic="true">{status}</p>
      {error && <p role="alert" tabIndex={-1} ref={errorRef} className="inventory-page__error">{error}</p>}
      {uncertain && <p>Revisa el estado del servidor antes de repetir el ajuste. Recuperar la consulta limpia el formulario.</p>}
      <section className="inventory-page__panel" aria-labelledby="api-inventory-adjust-heading"><h2 id="api-inventory-adjust-heading">Ajustar existencias por talla</h2>
        <p>Puedes ingresar una talla nueva; el servidor la crea al guardar. Declarar tallas en Productos no asigna unidades de inventario.</p>
        <form ref={form} className="inventory-page__form" noValidate onSubmit={(event) => { void submit(event); }} aria-busy={busy}>
          <div className="inventory-page__field"><label htmlFor="api-inventory-product">Producto</label><select id="api-inventory-product" name="productId" value={draft.productId} disabled={disabled} required aria-invalid={Boolean(errors.productId)} aria-describedby={errors.productId ? 'api-inventory-product-error' : undefined} onChange={(event) => fieldChange('productId', event.currentTarget.value)}><option value="">Selecciona un producto</option>{productIds.map((id) => <option key={id} value={id}>{name(id)} · #{id}</option>)}</select>{errors.productId && <p id="api-inventory-product-error" className="inventory-page__error">{errors.productId}</p>}</div>
          <div className="inventory-page__field"><label htmlFor="api-inventory-size">Talla</label><input id="api-inventory-size" name="size" list="api-inventory-sizes" value={draft.size} disabled={disabled} required aria-invalid={Boolean(errors.size)} aria-describedby={errors.size ? 'api-inventory-size-error' : undefined} onChange={(event) => fieldChange('size', event.currentTarget.value)} /><datalist id="api-inventory-sizes">{sizes.map((size) => <option key={size} value={size} />)}</datalist>{errors.size && <p id="api-inventory-size-error" className="inventory-page__error">{errors.size}</p>}</div>
          <div className="inventory-page__field"><label htmlFor="api-inventory-quantity">Cantidad física nueva</label><input id="api-inventory-quantity" name="quantity" inputMode="numeric" value={draft.quantity} disabled={disabled} required aria-invalid={Boolean(errors.quantity)} aria-describedby={`api-inventory-quantity-help${errors.quantity ? ' api-inventory-quantity-error' : ''}`} onChange={(event) => fieldChange('quantity', event.currentTarget.value)} /><p id="api-inventory-quantity-help">Unidades enteras, incluido cero. Es el total físico, no un incremento.{selected ? ` Reservado consultado: ${selected.reserved}.` : ''}</p>{errors.quantity && <p id="api-inventory-quantity-error" className="inventory-page__error">{errors.quantity}</p>}</div>
          <div className="inventory-page__field"><label htmlFor="api-inventory-reason">Motivo del ajuste</label><textarea id="api-inventory-reason" name="reason" rows={3} value={draft.reason} disabled={disabled} required aria-invalid={Boolean(errors.reason)} aria-describedby={errors.reason ? 'api-inventory-reason-error' : undefined} onChange={(event) => fieldChange('reason', event.currentTarget.value)} />{errors.reason && <p id="api-inventory-reason-error" className="inventory-page__error">{errors.reason}</p>}</div>
          <button type="submit" className="inventory-page__submit" disabled={disabled}>{busy ? 'Procesando…' : 'Guardar ajuste'}</button>
        </form>
        <p>La validación local usa la última consulta. El servidor verifica reservas y concurrencia al guardar. No se liberan reservas desde esta pantalla.</p>
      </section>
      <section className="inventory-page__panel" aria-labelledby="api-inventory-list-heading"><h2 id="api-inventory-list-heading">Existencias del servidor</h2>
        {loaded && !rows.length ? <p>No hay existencias por talla registradas. Selecciona un producto para ingresar su primera talla.</p> : null}
        <div className="inventory-page__table-region" role="region" aria-label="Inventario por producto y talla" tabIndex={0}>
          <table ref={table} className="inventory-page__table"><caption>Cantidades confirmadas por el servidor</caption><thead><tr><th scope="col">Producto</th><th scope="col">Talla</th><th scope="col">Físico</th><th scope="col">Reservado</th><th scope="col">Disponible</th><th scope="col">Acciones</th></tr></thead><tbody>{rows.map((row) => <tr key={JSON.stringify([row.productId, row.size])}>
            <th scope="row" tabIndex={-1} data-inventory-row data-product-id={row.productId} data-size={row.size}>{name(row.productId)}<span className="inventory-page__sku">ID: {row.productId}</span></th><td>{row.size}</td><td>{row.quantity}</td><td>{row.reserved}</td><td className="inventory-page__available">{row.available}</td><td><button type="button" className="inventory-page__secondary" disabled={disabled} aria-label={`Ajustar producto ${row.productId}, talla ${row.size}`} onClick={() => { setDraft({ productId: String(row.productId), size: row.size, quantity: String(row.quantity), reason: '' }); setErrors({}); setError(''); setStatus(''); form.current?.querySelector<HTMLInputElement>('[name="quantity"]')?.focus(); }}>Ajustar</button></td>
          </tr>)}</tbody></table>
        </div>
      </section>
    </main>
  </div>;
}
