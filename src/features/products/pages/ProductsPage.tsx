import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ProductPhoto, type ProductPhotoData } from '../../../shared/components/ProductPhoto/ProductPhoto';
import { readProductPhoto } from '../demo/readProductPhoto';
import { AdminHeader } from '../../../shared/components/AdminHeader/AdminHeader';
import { createDemoProduct, updateDemoProduct, deactivateDemoProduct, type Product, type ProductDraft, type ProductErrors } from '../demo/productsDemo';
import './ProductsPage.css';

const emptyDraft: ProductDraft = { code: '', name: '', description: '', price: '' };
const currency = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function ProductsPage({ products, onProductsChange }: { products: readonly Product[]; onProductsChange: (products: Product[]) => void }) {
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft);
  const [errors, setErrors] = useState<ProductErrors>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const editButtonRef = useRef<HTMLButtonElement | null>(null);
  const [photo, setPhoto] = useState<ProductPhotoData | null>(null);
  const [photoErrors, setPhotoErrors] = useState<{ file?: string; alt?: string }>({});
  const [photoBusy, setPhotoBusy] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const readVersion = useRef(0);
  const [status, setStatus] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
    const previousTitle = document.title;
    document.title = 'Productos | Fashion Online Store';
    return () => { document.title = previousTitle; readVersion.current += 1; };
  }, []);

  function changeField(field: keyof ProductDraft, value: string) {
    setDraft((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
    setStatus('');
  }

  function beginEdit(product: Product, button: HTMLButtonElement) {
    if (photoBusy) return;
    editButtonRef.current = button;
    setPhoto(product.image ?? null);
    setPhotoErrors({});
    if (photoInputRef.current) photoInputRef.current.value = "";
    setEditingId(product.id);
    setDraft({ code: product.code, name: product.name, description: product.description, price: (product.priceCents / 100).toFixed(2) });
    setErrors({});
    setStatus('');
    formRef.current?.querySelector<HTMLInputElement>('[name="code"]')?.focus();
  }

  function cancelEdit() {
    clearPhoto();
    setEditingId(null);
    setDraft(emptyDraft);
    setErrors({});
    setStatus('Edición cancelada. No se guardaron cambios.');
    editButtonRef.current?.focus();
  }

  function handleDeactivate(productId: string) {
    const result = deactivateDemoProduct(products, productId);
    if (!result.ok) { setStatus(result.message); return; }
    onProductsChange(result.products);
    setStatus(`Producto ${result.product.code} desactivado en la demostración. El registro se conserva y no se modificaron pedidos.`);
  }

  function clearPhoto() {
    readVersion.current += 1;
    setPhoto(null);
    setPhotoBusy(false);
    setPhotoErrors({});
    if (photoInputRef.current) photoInputRef.current.value = '';
  }

  async function selectPhoto(file: File | undefined) {
    if (!file) return;
    const version = ++readVersion.current;
    setPhotoBusy(true);
    setPhotoErrors({});
    try {
      const src = await readProductPhoto(file);
      if (readVersion.current !== version) return;
      setPhoto({ src, alt: draft.name.trim() ? `Foto de ${draft.name.trim()}` : 'Foto de la prenda', source: 'local' });
    } catch (cause: unknown) {
      if (readVersion.current === version) setPhotoErrors({ file: cause instanceof Error ? cause.message : 'No se pudo leer la foto.' });
    } finally {
      if (readVersion.current === version) setPhotoBusy(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (photoBusy) return;
    if (photoErrors.file) { photoInputRef.current?.focus(); return; }
    if (photo && !photo.alt.trim()) {
      setPhotoErrors({ alt: 'Describe la prenda para quienes no pueden ver la foto.' });
      formRef.current?.querySelector<HTMLInputElement>('[name="photoAlt"]')?.focus();
      return;
    }
    const result = editingId ? updateDemoProduct(products, editingId, draft, photo) : createDemoProduct(products, draft, photo);
    setStatus('');
    if (!result.ok) {
      setErrors(result.errors);
      formRef.current?.querySelector<HTMLElement>(`[name="${Object.keys(result.errors)[0]}"]`)?.focus();
      return;
    }
    onProductsChange(result.products);
    clearPhoto();
    setDraft(emptyDraft);
    setErrors({});
    setStatus(editingId ? `Producto ${result.product.code} actualizado en la demostración. Los datos de pedidos anteriores no cambian.` : `Producto ${result.product.code} registrado en la demostración. No se crearon existencias.`);
    if (editingId) editButtonRef.current?.focus();
    setEditingId(null);
  }

  return <div className="products-page">
    <a className="products-page__skip" href="#products-heading">Saltar a productos</a>
    <AdminHeader />
    <main className="products-page__main">
      <h1 id="products-heading" ref={headingRef} tabIndex={-1}>Productos</h1>
      <p className="products-page__notice">Demostración sin autenticación ni autorización de administrador. Los productos se guardan solo en memoria y se pierden al recargar. Los cambios se reflejan en el catálogo. No cambian el inventario ni los pedidos del checkout.</p>
      <section className="products-page__panel" aria-labelledby="product-register-heading">
        <h2 id="product-register-heading">{editingId ? "Editar producto" : "Registrar producto"}</h2>
        {editingId && <p>Estás editando un registro existente. Guardar conserva su identificador interno y su estado activo o inactivo.</p>}
        <form className="products-page__form" ref={formRef} onSubmit={handleSubmit} noValidate>
          {(['code', 'name', 'description', 'price'] as const).map((field) => {
            const label = { code: 'Identificador comercial', name: 'Nombre del producto', description: 'Descripción del producto', price: 'Precio en COP' }[field];
            const common = {
              id: `product-${field}`, name: field, value: draft[field], required: true,
              'aria-invalid': Boolean(errors[field]),
              'aria-describedby': [field === 'code' ? 'product-code-help' : field === 'price' ? 'product-price-help' : '', errors[field] ? `product-${field}-error` : ''].filter(Boolean).join(' ') || undefined,
            };
            return <div className="products-page__field" key={field}>
              <label htmlFor={`product-${field}`}>{label}</label>
              {field === 'description' ? <textarea {...common} rows={3} onChange={(event) => changeField(field, event.currentTarget.value)} /> : <input {...common} type="text" inputMode={field === 'price' ? 'decimal' : undefined} onChange={(event) => changeField(field, event.currentTarget.value)} />}
              {field === 'code' && <p id="product-code-help">Identifica el producto, no una talla. Se guarda sin espacios exteriores y en mayúsculas.</p>}
              {field === 'price' && <p id="product-price-help">Sin separadores de miles. Ejemplo: 89900 o 89900,50.</p>}
              {errors[field] && <p className="products-page__error" id={`product-${field}-error`}>{errors[field]}</p>}
            </div>;
          })}
          <div className="products-page__field">
            <label htmlFor="product-photo">Foto del producto (opcional)</label>
            <input ref={photoInputRef} id="product-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" aria-invalid={Boolean(photoErrors.file)} aria-describedby={`product-photo-help${photoErrors.file ? ' product-photo-error' : ''}`} onChange={(event) => { void selectPhoto(event.currentTarget.files?.[0]); }} />
            <p id="product-photo-help">JPG, PNG o WebP, hasta 5 MB para esta demostración. La foto se lee en este navegador; no se sube a un servidor.</p>
            {photoErrors.file && <p className="products-page__error" id="product-photo-error">{photoErrors.file}</p>}
            <p role="status" aria-label="Lectura de foto" aria-atomic="true">{photoBusy ? 'Leyendo foto…' : ''}</p>
          </div>
          {photo && <div className="products-page__photo-preview">
            <ProductPhoto photo={photo} eager />
            <div className="products-page__field">
              <label htmlFor="product-photo-alt">Descripción de la foto</label>
              <input id="product-photo-alt" name="photoAlt" type="text" value={photo.alt} required aria-invalid={Boolean(photoErrors.alt)} aria-describedby={photoErrors.alt ? 'product-photo-alt-error' : undefined} onChange={(event) => { const alt = event.currentTarget.value; setPhoto((previous) => previous ? { ...previous, alt } : null); setPhotoErrors((previous) => ({ ...previous, alt: undefined })); }} />
              {photoErrors.alt && <p className="products-page__error" id="product-photo-alt-error">{photoErrors.alt}</p>}
            </div>
          </div>}
          {(photo || photoErrors.file || photoBusy) && <button type="button" className="products-page__secondary" onClick={clearPhoto}>Quitar foto o selección</button>}
          <button type="submit" className="products-page__submit" disabled={photoBusy}>{editingId ? "Guardar cambios de demostración" : "Registrar producto de demostración"}</button>
          {editingId && <button type="button" className="products-page__secondary" onClick={cancelEdit}>Cancelar edición</button>}
        </form>
        <p role="status" aria-label="Registro de producto" aria-atomic="true">{status}</p>
      </section>
      <section className="products-page__panel" aria-labelledby="product-list-heading">
        <h2 id="product-list-heading">Productos de esta sesión</h2>
        <ul className="products-page__list">{products.map((product) => <li key={product.id}>
          <ProductPhoto photo={product.image} />
          <h3>{product.name}</h3><p>Identificador: {product.code}</p><p>{product.description}</p>
          <p>Precio: {currency.format(product.priceCents / 100)}</p><p>Estado: {product.active ? 'Activo' : 'Inactivo'}</p>
          <div className="products-page__actions">
            <button type="button" className="products-page__secondary" disabled={photoBusy} onClick={(event) => beginEdit(product, event.currentTarget)}>Editar {product.code}</button>
            <button type="button" className="products-page__secondary" disabled={!product.active} onClick={() => handleDeactivate(product.id)}>Desactivar {product.code}</button>
          </div>
        </li>)}</ul>
      </section>
    </main>
  </div>;
}
