import type { Product } from '../products/demo/productsDemo';
import { getDemoAvailability } from '../catalog/demo/catalogDemo.ts';

export interface CartLine { productId: string; sku: string; size: string; quantity: number }
export type AddCartResult = { ok: false; message: string } | { ok: true; lines: CartLine[]; message: string };

export function cartSubtotalCents(lines: readonly CartLine[], products: readonly Product[]): number {
  const subtotal = lines.reduce((sum, line) => {
    const product = products.find((candidate) => candidate.id === line.productId);
    if (!product || !Number.isSafeInteger(line.quantity) || line.quantity <= 0) throw new Error('El carrito contiene un artículo inválido.');
    return sum + product.priceCents * line.quantity;
  }, 0);
  if (!Number.isSafeInteger(subtotal)) throw new Error('La cantidad supera la precisión admitida en esta demostración.');
  return subtotal;
}

// Solo prepara selección de compra; no modifica productos ni inventario.
export function addCartItem(products: readonly Product[], lines: readonly CartLine[], productId: string,
  sku: string, quantityText: string): AddCartResult {
  const product = products.find((candidate) => candidate.id === productId && candidate.active);
  if (!product) return { ok: false, message: 'El producto no está activo o ya no existe.' };
  const variant = getDemoAvailability(productId).find((candidate) => candidate.sku === sku);
  if (!variant) return { ok: false, message: 'Selecciona una talla disponible para este producto.' };
  if (variant.available <= 0) return { ok: false, message: 'Esta talla no tiene disponibilidad en los datos de demostración.' };
  const quantity = Number(quantityText.trim());
  if (!/^\d+$/.test(quantityText.trim()) || !Number.isSafeInteger(quantity) || quantity <= 0) return { ok: false, message: 'Escribe una cantidad entera mayor que cero.' };
  const existing = lines.find((line) => line.productId === productId && line.sku === sku);
  const accumulated = (existing?.quantity ?? 0) + quantity;
  if (!Number.isSafeInteger(accumulated)) return { ok: false, message: 'La cantidad supera la precisión admitida en esta demostración.' };
  const next = existing ? lines.map((line) => line.productId === productId && line.sku === sku ? { ...line, quantity: accumulated } : { ...line }) : [...lines, { productId, sku, size: variant.size, quantity }];
  try { cartSubtotalCents(next, products); } catch (cause: unknown) { return { ok: false, message: cause instanceof Error ? cause.message : 'No se pudo actualizar el carrito.' }; }
  return { ok: true, lines: next, message: `${product.name}, talla ${variant.size}: ${quantity} unidades agregadas al carrito. No se reservó inventario.` };
}
