import type { Product } from '../../products/demo/productsDemo';
import type { InventoryItem } from './inventoryDemo';

export interface VariantDraft { productId: string; sku: string; size: string }
export type VariantErrors = Partial<Record<keyof VariantDraft, string>>;
export type VariantResult = { ok: false; errors: VariantErrors } | { ok: true; item: InventoryItem; items: InventoryItem[] };

// Alta local de artículo vendible: las existencias se registran mediante un ajuste aparte.
export function createDemoVariant(items: readonly InventoryItem[], products: readonly Product[], draft: VariantDraft): VariantResult {
  const product = products.find((candidate) => candidate.id === draft.productId && candidate.active);
  const sku = draft.sku.trim().toUpperCase();
  const size = draft.size.trim().toLocaleUpperCase('es-CO');
  const errors: VariantErrors = {};
  if (!product) errors.productId = 'Selecciona un producto activo.';
  if (!sku) errors.sku = 'Escribe el SKU de esta talla.';
  else if (items.some((item) => item.sku.trim().toUpperCase() === sku)) errors.sku = 'Ya existe un artículo con este SKU.';
  if (!size) errors.size = 'Escribe la talla.';
  else if (items.some((item) => item.productId === draft.productId && item.size.trim().toLocaleUpperCase('es-CO') === size)) errors.size = 'Este producto ya tiene un artículo para esa talla.';
  if (!product || Object.keys(errors).length) return { ok: false, errors };
  const item: InventoryItem = { productId: product.id, sku, name: product.name, size, existing: 0, reserved: 0 };
  return { ok: true, item, items: [...items, item] };
}
