import { useEffect, useRef } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ApiAddToCartForm } from '../../cart/components/ApiAddToCartForm';
import { AddToCartForm } from '../../cart/components/AddToCartForm';
import '../../cart/pages/CartPage.css';
import { ProductPhoto } from '../../../shared/components/ProductPhoto/ProductPhoto';
import { CustomerHeader } from '../../../shared/components/CustomerHeader/CustomerHeader';
import type { Product } from '../../products/demo/productsDemo';
import { filterActiveProducts, getDemoAvailability } from '../demo/catalogDemo';
import './CatalogPage.css';

import type { InventoryItem } from "../../inventory/demo/inventoryDemo";

import { useCatalog } from "../useCatalog";

const currency = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function CatalogPage({ inventoryItems, products, cartCount, onAddToCart }: { inventoryItems: readonly InventoryItem[]; products: readonly Product[]; cartCount: number; onAddToCart: (productId: string, sku: string, quantity: string) => { ok: boolean; message: string } }) {
  const { productId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const demo = (searchParams.get('source') ?? import.meta.env.VITE_CATALOG_SOURCE) === 'demo';
  function updateQuery(value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set('q', value); else next.delete('q');
    setSearchParams(next, { replace: true });
  }
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { state: load, reload } = useCatalog(products, demo, productId);
  const loadedProducts = load.status === 'ready' ? load.products : [];
  const restoreFocus = useRef(false);
  const retryRef = useRef<HTMLButtonElement>(null);
  const product = productId ? loadedProducts.find((candidate) => candidate.id === productId && candidate.active) : undefined;
  const matches = filterActiveProducts(loadedProducts, query);
  const availability = product ? demo ? getDemoAvailability(product.id, inventoryItems) : product.availability ?? [] : [];
  const title = productId ? load.status === 'ready' ? product?.name ?? 'Producto no disponible' : 'Detalle del producto' : 'Catálogo';
  const backToCatalog = `/catalog${searchParams.size ? `?${searchParams}` : ''}`;

  useEffect(() => {
    headingRef.current?.focus();
    const previousTitle = document.title;
    document.title = `${title} | Fashion Online Store`;
    return () => { document.title = previousTitle; };
  }, [productId, title]);

  useEffect(() => {
    if (!restoreFocus.current || load.status === 'loading') return;
    restoreFocus.current = false;
    (load.status === 'error' ? retryRef.current : headingRef.current)?.focus();
  }, [load.status]);

  function reloadCatalog(fail = false) {
    restoreFocus.current = true;
    reload(fail);
  }

  return <>
    <CustomerHeader catalogSource={demo ? "demo" : "api"} cartItemCount={cartCount} cartTo="/cart" homeTo={searchParams.has("source") ? `/catalog?source=${demo ? "demo" : "api"}` : "/catalog"} contentHeadingId="catalog-heading" skipLabel="Saltar al catálogo"
      search={!productId ? { query, onChange: (value) => updateQuery(value) } : undefined} />
    <main className="catalog-page">
      <div className="catalog-page__intro">
        <p className="catalog-page__eyebrow">Fashion · Online Store</p>
        <h1 id="catalog-heading" ref={headingRef} tabIndex={-1}>{title}</h1>
        <p>{demo ? "Catálogo de demostración. Consulta asíncrona simulada, sin conexión a una API. Los productos se conservan en memoria hasta recargar." : "Catálogo del servidor. Precios en pesos colombianos y disponibilidad consultada al abrir cada producto."}</p>
        <p><Link to={`/catalog?source=${demo ? "api" : "demo"}`}>{demo ? "Ver catálogo del servidor" : "Ver catálogo de demostración"}</Link></p>
        {demo && <details className="catalog-page__load-controls">
          <summary>Pruebas de carga (demostración)</summary>
          <p>Estos controles reproducen una consulta correcta o fallida sin cambiar productos, carrito o inventario.</p>
          <div className="catalog-page__load-actions">
            <button type="button" className="catalog-page__clear" disabled={load.status === 'loading'} onClick={() => reloadCatalog(true)}>Simular fallo de consulta</button>
            <button type="button" className="catalog-page__clear" disabled={load.status === 'loading'} onClick={() => reloadCatalog()}>Recargar consulta de demostración</button>
          </div>
        </details>}
      </div>
      {load.status === 'loading' && <p role="status" aria-atomic="true">{demo ? "Consultando catálogo de demostración…" : "Consultando catálogo…"}</p>}
      <div aria-busy={load.status === 'loading'}>
      {load.status === 'loading' ? null : load.status === 'error' ? <section className="catalog-page__detail" aria-label="Error de consulta del catálogo">
        <h2>Catálogo temporalmente no disponible</h2>
        <p role="alert">{load.message}</p>
        <button ref={retryRef} type="button" className="catalog-page__clear" onClick={() => reloadCatalog()}>Reintentar consulta</button>
      </section> : productId ? product ? <article className="catalog-page__detail catalog-page__detail--with-photo">
        <ProductPhoto photo={product.image} eager />
        <div className="catalog-page__detail-info">
        <p>Identificador comercial: {product.code}</p>
        <p className="catalog-page__price">{currency.format(product.priceCents / 100)}</p>
        <h2>Descripción</h2><p>{product.description}</p>
        <h2>{demo ? "Disponibilidad por talla — demostración" : "Disponibilidad por talla"}</h2>
        {availability.length ? <ul>{availability.map((item) => <li key={item.sku}>Talla {item.size}: {item.available > 0 ? `${item.available} unidades disponibles` : 'Sin disponibilidad'}</li>)}</ul> : <p>{demo ? "Disponibilidad sin confirmar: este producto no tiene artículos de inventario asociados en la demostración." : "No hay disponibilidad por talla registrada para este producto."}</p>}
        <p>{demo ? "Disponibilidad de esta sesión: refleja los ajustes y reservas del laboratorio de Inventario. El backend deberá confirmarla antes de registrar la compra." : "El servidor deberá volver a confirmar disponibilidad al comprar. Agregar al carrito no reserva existencias."}</p>
        {demo ? <AddToCartForm key={product.id} variants={availability} onAdd={(sku, quantity) => onAddToCart(product.id, sku, quantity)} /> : <ApiAddToCartForm key={product.id} productId={Number(product.id)} variants={availability} />}
        <Link to={backToCatalog}>Volver al catálogo</Link>
        </div>
      </article> : <section className="catalog-page__detail" aria-label="Producto no disponible">
        <p>El producto no existe o está inactivo. No se presentan sus datos comerciales para nuevas compras.</p>
        <Link to={backToCatalog}>Volver al catálogo</Link>
      </section> : <>
        <p role="status" aria-atomic="true">{matches.length ? `${matches.length} ${matches.length === 1 ? "producto encontrado" : "productos encontrados"}.` : query.trim() ? 'No encontramos productos que coincidan con tu búsqueda.' : 'No hay productos activos para mostrar.'}</p>
        {query && <button type="button" className="catalog-page__clear" onClick={() => updateQuery('')}>Limpiar búsqueda</button>}
        <ul className="catalog-page__grid">{matches.map((item) => <li key={item.id}>
          <ProductPhoto photo={item.image} />
          <p className="catalog-page__eyebrow">{item.code}</p>
          <h2><Link to={`/catalog/${encodeURIComponent(item.id)}${searchParams.size ? `?${searchParams}` : ''}`}>{item.name}</Link></h2>
          <p className="catalog-page__price">{currency.format(item.priceCents / 100)}</p>
        </li>)}</ul>
      </>}
      </div>
    </main>
  </>;
}
