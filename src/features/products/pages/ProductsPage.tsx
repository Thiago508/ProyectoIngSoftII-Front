import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AdminHeader } from '../../../shared/components/AdminHeader/AdminHeader';
import { createDemoProduct, productsDemo, type Product, type ProductDraft, type ProductErrors } from '../demo/productsDemo';
import './ProductsPage.css';

const emptyDraft: ProductDraft = { code: '', name: '', description: '', price: '' };
const currency = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>(() => productsDemo.map((product) => ({ ...product })));
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft);
  const [errors, setErrors] = useState<ProductErrors>({});
  const [status, setStatus] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
    const previousTitle = document.title;
    document.title = 'Productos | Fashion Online Store';
    return () => { document.title = previousTitle; };
  }, []);

  function changeField(field: keyof ProductDraft, value: string) {
    setDraft((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
    setStatus('');
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = createDemoProduct(products, draft);
    setStatus('');
    if (!result.ok) {
      setErrors(result.errors);
      formRef.current?.querySelector<HTMLElement>(`[name="${Object.keys(result.errors)[0]}"]`)?.focus();
      return;
    }
    setProducts(result.products);
    setDraft(emptyDraft);
    setErrors({});
    setStatus(`Producto ${result.product.code} registrado en la demostración. No se crearon existencias.`);
  }

  return <div className="products-page">
    <a className="products-page__skip" href="#products-heading">Saltar a productos</a>
    <AdminHeader />
    <main className="products-page__main">
      <h1 id="products-heading" ref={headingRef} tabIndex={-1}>Productos</h1>
      <p className="products-page__notice">Demostración sin autenticación ni autorización de administrador. Los productos se guardan solo en memoria y se pierden al recargar o salir. No cambian el inventario ni los pedidos del checkout.</p>
      <section className="products-page__panel" aria-labelledby="product-register-heading">
        <h2 id="product-register-heading">Registrar producto</h2>
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
          <button type="submit" className="products-page__submit">Registrar producto de demostración</button>
        </form>
        <p role="status" aria-atomic="true">{status}</p>
      </section>
      <section className="products-page__panel" aria-labelledby="product-list-heading">
        <h2 id="product-list-heading">Productos de esta sesión</h2>
        <ul className="products-page__list">{products.map((product) => <li key={product.id}>
          <h3>{product.name}</h3><p>Identificador: {product.code}</p><p>{product.description}</p>
          <p>Precio: {currency.format(product.priceCents / 100)}</p><p>Estado: {product.active ? 'Activo' : 'Inactivo'}</p>
        </li>)}</ul>
      </section>
    </main>
  </div>;
}
