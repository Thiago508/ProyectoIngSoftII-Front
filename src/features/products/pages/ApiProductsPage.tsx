import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AdminHeader } from '../../../shared/components/AdminHeader/AdminHeader';
import { ProductPhoto } from '../../../shared/components/ProductPhoto/ProductPhoto';
import { ApiError, createApiClient } from '../../../shared/api/apiClient';
import { getApiBaseUrl } from '../../../shared/api/apiConfig';
import { useAuth } from '../../auth/AuthContext';
import { apiProductErrors, deactivateApiProduct, emptyApiProduct, listApiProducts, productDraft, saveApiProduct, validateApiProduct, type AdminProduct, type ApiProductDraft, type ApiProductErrors, type ProductField } from '../productsApi';
import './ProductsPage.css';

const labels: Record<ProductField, string> = { slug: 'Slug del producto', sku: 'SKU del producto (opcional)', name: 'Nombre del producto', description: 'Descripción del producto', price: 'Precio en COP', category: 'Categoría', sizes: 'Tallas separadas por comas', image: 'URL de imagen (opcional)' };
const fields = Object.keys(labels) as ProductField[];
const currency = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
export function ApiProductsPage() {
  const auth = useAuth();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(true);
  const [uncertain, setUncertain] = useState(false);
  const [draft, setDraft] = useState<ApiProductDraft>(emptyApiProduct);
  const [editingId, setEditingId] = useState<number | undefined>();
  const [errors, setErrors] = useState<ApiProductErrors>({});
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Consultando productos…');
  const pending = useRef<AbortController | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const focusProduct = useRef<number | null>(null);
  const list = useRef<HTMLUListElement>(null);
  const editButton = useRef<HTMLButtonElement | null>(null);
  const token = auth.session?.accessToken;

  useEffect(() => {
    heading.current?.focus();
    const previous = document.title;
    document.title = 'Productos | Fashion Online Store';
    return () => { document.title = previous; };
  }, []);
  useEffect(() => {
    if (busy) return;
    if (error) {
      const field = fields.find((field) => errors[field]);
      (field ? form.current?.querySelector<HTMLElement>(`[name="${field}"]`) : errorRef.current)?.focus();
    } else if (focusProduct.current !== null) {
      const item = list.current?.querySelector<HTMLElement>(`[data-product-id="${focusProduct.current}"] h3`);
      (item ?? heading.current)?.focus();
      focusProduct.current = null;
    }
  }, [busy, error, errors, products]);

  const read = useCallback((recover = false) => {
    if (pending.current) return Promise.resolve();
    const controller = new AbortController(); pending.current = controller;
    return Promise.resolve().then(() => {
      const base = getApiBaseUrl();
      return listApiProducts(createApiClient(base), base, controller.signal);
    }).then((result) => {
      if (controller.signal.aborted) return;
      setProducts(result); setLoaded(true); setStatus('Productos consultados.');
      if (recover) { setDraft(emptyApiProduct); setEditingId(undefined); setErrors({}); }
      setUncertain(false);
    }, (cause: unknown) => {
      if (!controller.signal.aborted) { setLoaded(false); setError(cause instanceof Error ? cause.message : 'No se pudieron consultar los productos.'); setStatus(''); }
    }).finally(() => { if (pending.current === controller) pending.current = null; if (!controller.signal.aborted) setBusy(false); });
  }, []);
  useEffect(() => {
    void read();
    return () => { pending.current?.abort(); pending.current = null; };
  }, [read, token]);

  async function write(kind: 'save' | 'deactivate', id?: number) {
    if (pending.current || !token || uncertain || !loaded) return;
    if (kind === 'save') {
      const next = validateApiProduct(draft); setErrors(next);
      if (Object.keys(next).length) { setError('Revisa los campos del producto.'); return; }
    }
    const controller = new AbortController(); pending.current = controller;
    setBusy(true); setError(''); setErrors({}); setStatus('Guardando en el servidor…');
    try {
      const base = getApiBaseUrl(); const client = createApiClient(base);
      const product = kind === 'save' ? await saveApiProduct(client, base, token, controller.signal, draft, id) : await deactivateApiProduct(client, base, token, controller.signal, id!);
      if (controller.signal.aborted) return;
      setProducts((previous) => previous.some((item) => item.id === product.id) ? previous.map((item) => item.id === product.id ? product : item) : [...previous, product]);
      setDraft(emptyApiProduct); setEditingId(undefined); focusProduct.current = product.id;
      setStatus(kind === 'deactivate' ? 'Producto desactivado por el servidor.' : id === undefined ? 'Producto creado por el servidor. Gestiona existencias por talla desde inventario cuando esté integrado.' : 'Producto actualizado por el servidor.');
    } catch (cause: unknown) {
      if (controller.signal.aborted) return;
      if (cause instanceof ApiError && cause.status === 401) auth.invalidateSession(token);
      const unknown = !(cause instanceof ApiError) || cause.kind !== 'http' || (cause.status ?? 500) >= 500;
      setUncertain(unknown);
      setErrors(apiProductErrors(cause));
      const message = cause instanceof ApiError && cause.status === 403 ? 'No tienes permiso para modificar productos.' : cause instanceof Error ? cause.message : 'No se pudo guardar el producto.';
      setError(unknown ? `${message} El cambio podría haberse aplicado. Consulta los productos antes de volver a guardar.` : message);
      setStatus('');
    } finally { if (pending.current === controller) pending.current = null; if (!controller.signal.aborted) setBusy(false); }
  }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void write('save', editingId); }
  function edit(product: AdminProduct, button: HTMLButtonElement) {
    setDraft(productDraft(product)); setEditingId(product.id); setError(''); setErrors({}); setStatus(''); editButton.current = button;
    form.current?.querySelector<HTMLInputElement>('[name="slug"]')?.focus();
  }
  return <div className="products-page">
    <a className="products-page__skip" href="#products-heading">Saltar a productos</a><AdminHeader />
    <main className="products-page__main"><h1 id="products-heading" tabIndex={-1} ref={heading}>Productos</h1>
      <p className="products-page__notice">Administración conectada al servidor. Los cambios se guardan en el backend. Crear o editar datos comerciales no asigna existencias por talla.</p>
      <p><Link to="/admin/products?source=demo">Ver productos de demostración</Link></p>
      <button type="button" className="products-page__secondary" disabled={busy} onClick={() => { setBusy(true); setError(''); setStatus('Consultando productos…'); void read(uncertain); }}>Consultar productos</button>
      <p role="status" aria-label="Operaciones de productos" aria-atomic="true">{status}</p>
      {error && <p ref={errorRef} tabIndex={-1} role="alert" className="products-page__error">{error}</p>}
      {uncertain && <p>Revisa el listado antes de crear de nuevo. Al recuperar la consulta se limpia el formulario para evitar repetir un alta.</p>}
      <section className="products-page__panel" aria-labelledby="api-product-form-heading">
        <h2 id="api-product-form-heading">{editingId === undefined ? 'Registrar producto' : 'Editar producto'}</h2>
        <form ref={form} className="products-page__form" noValidate onSubmit={submit} aria-busy={busy}>
          {fields.map((field) => <div className="products-page__field" key={field}>
            <label htmlFor={`api-product-${field}`}>{labels[field]}</label>
            {field === 'description' ? <textarea id={`api-product-${field}`} name={field} value={draft[field]} required disabled={busy || uncertain || !loaded} rows={3} aria-invalid={Boolean(errors[field])} aria-describedby={errors[field] ? `api-product-${field}-error` : undefined} onChange={(event) => { setDraft({ ...draft, [field]: event.currentTarget.value }); setErrors({ ...errors, [field]: undefined }); setError(''); }} /> : <input id={`api-product-${field}`} name={field} type="text" inputMode={field === 'price' ? 'numeric' : undefined} value={draft[field]} required={['slug', 'name', 'price', 'category'].includes(field)} disabled={busy || uncertain || !loaded} aria-invalid={Boolean(errors[field])} aria-describedby={[field === 'price' || field === 'sizes' || field === 'image' ? `api-product-${field}-help` : '', errors[field] ? `api-product-${field}-error` : ''].filter(Boolean).join(' ') || undefined} onChange={(event) => { setDraft({ ...draft, [field]: event.currentTarget.value }); setErrors({ ...errors, [field]: undefined }); setError(''); }} />}
            {field === 'price' && <p id="api-product-price-help">Pesos COP enteros, sin decimales ni separadores de miles. Ejemplo: 89900.</p>}
            {field === 'sizes' && <p id="api-product-sizes-help">Ejemplo: S, M, L. Esta lista no crea ni modifica stock por talla.</p>}
            {field === 'image' && <p id="api-product-image-help">URL HTTP/HTTPS o ruta del servidor. No se suben archivos; dejar vacío conserva el producto sin foto.</p>}
            {errors[field] && <p id={`api-product-${field}-error`} className="products-page__error">{errors[field]}</p>}
          </div>)}
          <label><input type="checkbox" checked={draft.featured} disabled={busy || uncertain || !loaded} onChange={(event) => setDraft({ ...draft, featured: event.currentTarget.checked })} /> Producto destacado</label>
          <button type="submit" className="products-page__submit" disabled={busy || uncertain || !loaded}>{busy ? 'Procesando…' : editingId === undefined ? 'Crear producto' : 'Guardar cambios'}</button>
          {editingId !== undefined && <button type="button" className="products-page__secondary" disabled={busy} onClick={() => { setDraft(emptyApiProduct); setEditingId(undefined); setErrors({}); setError(''); setStatus('Edición cancelada.'); editButton.current?.focus(); }}>Cancelar edición</button>}
        </form>
      </section>
      <section className="products-page__panel" aria-labelledby="api-product-list-heading"><h2 id="api-product-list-heading">Productos del servidor</h2>
        {loaded && !products.length && <p>No hay productos para mostrar.</p>}
        <ul ref={list} className="products-page__list">{products.map((product) => <li key={product.id} data-product-id={product.id}>
          <ProductPhoto photo={product.display.image} /><h3 tabIndex={-1}>{product.name}</h3><p>Slug: {product.slug} · SKU: {product.sku ?? 'Sin asignar'}</p><p>{product.description}</p><p>Categoría: {product.category}</p><p>Precio: {currency.format(product.price)}</p><p>Estado: {product.active ? 'Activo' : 'Inactivo'}</p>
          <div className="products-page__actions"><button type="button" className="products-page__secondary" disabled={busy || uncertain || !loaded} onClick={(event) => edit(product, event.currentTarget)}>Editar {product.slug}</button><button type="button" className="products-page__secondary" disabled={busy || uncertain || !loaded || !product.active} onClick={() => { void write('deactivate', product.id); }}>Desactivar {product.slug}</button></div>
        </li>)}</ul>
      </section>
    </main>
  </div>;
}
