import { useRef, useState, type FormEvent } from 'react';
import type { Product } from '../../products/demo/productsDemo';
import type { VariantDraft, VariantErrors, VariantResult } from '../demo/createDemoVariant';

const emptyDraft: VariantDraft = { productId: '', sku: '', size: '' };

export function InventoryVariantForm({ products, onCreate }: {
  products: readonly Product[]; onCreate: (draft: VariantDraft) => VariantResult;
}) {
  const [draft, setDraft] = useState<VariantDraft>(emptyDraft);
  const [errors, setErrors] = useState<VariantErrors>({});
  const [status, setStatus] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const activeProducts = products.filter((product) => product.active);

  function change(field: keyof VariantDraft, value: string) {
    setDraft((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined, ...(field === 'productId' ? { size: undefined } : {}) }));
    setStatus('');
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = onCreate(draft);
    setStatus('');
    if (!result.ok) {
      setErrors(result.errors);
      const first = (['productId', 'sku', 'size'] as const).find((field) => result.errors[field]);
      if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setDraft({ productId: result.item.productId ?? '', sku: '', size: '' });
    setErrors({});
    setStatus(`Talla ${result.item.size} registrada para ${result.item.name}, SKU ${result.item.sku}. Existente: 0; reservado: 0. Usa Ajustar existencias para registrar stock con motivo.`);
  }

  return <section className="inventory-page__panel" aria-labelledby="variant-heading">
    <h2 id="variant-heading">Registrar talla / SKU</h2>
    <p>Cada artículo se asocia a un producto activo y una talla. El SKU y la talla se guardan en mayúsculas, sin espacios exteriores. No se crean existencias automáticamente.</p>
    {!activeProducts.length && <p>No hay productos activos. Registra un producto antes de asociar tallas.</p>}
    <form className="inventory-page__form" ref={formRef} onSubmit={submit} noValidate>
      <div className="inventory-page__field">
        <label htmlFor="variant-product">Producto de la talla</label>
        <select id="variant-product" name="productId" value={draft.productId} required aria-invalid={Boolean(errors.productId)} aria-describedby={errors.productId ? 'variant-product-error' : undefined} onChange={(event) => change('productId', event.currentTarget.value)}>
          <option value="">Selecciona un producto</option>
          {activeProducts.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.code}</option>)}
        </select>
        {errors.productId && <p id="variant-product-error" className="inventory-page__error">{errors.productId}</p>}
      </div>
      <div className="inventory-page__field">
        <label htmlFor="variant-sku">SKU de la talla</label>
        <input id="variant-sku" name="sku" type="text" value={draft.sku} required aria-invalid={Boolean(errors.sku)} aria-describedby={errors.sku ? 'variant-sku-error' : undefined} onChange={(event) => change('sku', event.currentTarget.value)} />
        {errors.sku && <p id="variant-sku-error" className="inventory-page__error">{errors.sku}</p>}
      </div>
      <div className="inventory-page__field">
        <label htmlFor="variant-size">Talla del artículo</label>
        <input id="variant-size" name="size" type="text" value={draft.size} required aria-invalid={Boolean(errors.size)} aria-describedby={`variant-size-help${errors.size ? ' variant-size-error' : ''}`} onChange={(event) => change('size', event.currentTarget.value)} />
        <p id="variant-size-help">Ejemplos de etiqueta: S, M, 38 o ÚNICA. No se limita a una lista de tallas predeterminada.</p>
        {errors.size && <p id="variant-size-error" className="inventory-page__error">{errors.size}</p>}
      </div>
      <button className="inventory-page__submit" type="submit" disabled={!activeProducts.length}>Registrar talla de demostración</button>
    </form>
    <p role="status" aria-atomic="true">{status}</p>
  </section>;
}
