import type { Product } from '../products/demo/productsDemo';
import type { CheckoutItem } from '../checkout/types/checkout.types';
import { getDemoAvailability } from '../catalog/demo/catalogDemo.ts';
import { cartSubtotalCents, type CartLine } from './cart.ts';

import { inventoryDemo, type InventoryItem } from '../inventory/demo/inventoryDemo.ts';

// Validación local de una instantánea; la confirmación definitiva corresponde al servidor.
export function prepareCheckoutCart(lines: readonly CartLine[], products: readonly Product[], inventoryItems: readonly InventoryItem[] = inventoryDemo): CheckoutItem[] {
  cartSubtotalCents(lines, products);
  return lines.map((line) => {
    const product = products.find((candidate) => candidate.id === line.productId && candidate.active);
    const variant = getDemoAvailability(line.productId, inventoryItems).find((candidate) => candidate.sku === line.sku && candidate.size === line.size);
    if (!product || !variant || variant.available < line.quantity) throw new Error('Hay artículos inactivos o sin disponibilidad suficiente en el inventario de esta sesión de demostración. Revisa el carrito.');
    if (!Number.isSafeInteger(product.priceCents) || product.priceCents <= 0) throw new Error('El precio del producto no es válido.');
    return { id: line.sku, name: product.name, size: line.size, quantity: line.quantity, unitPrice: product.priceCents / 100 };
  });
}
