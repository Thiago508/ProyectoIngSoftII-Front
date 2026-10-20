import type { Product } from '../../products/demo/productsDemo';
import { inventoryDemo, type InventoryItem } from '../../inventory/demo/inventoryDemo.ts';

export function filterActiveProducts(products: readonly Product[], query: string): Product[] {
  const search = query.trim().toLocaleLowerCase('es-CO');
  return products.filter((product) => product.active && product.name.toLocaleLowerCase('es-CO').includes(search));
}

// Asociación explícita entre ejemplos; no es un contrato de catálogo/inventario.
// La aplicación pasa el inventario compartido; el valor por defecto sirve a ejemplos y pruebas.
export function getDemoAvailability(productId: string, items: readonly InventoryItem[] = inventoryDemo) {
  const skus: Readonly<Record<string, readonly string[]>> = {
    'demo-dress': ['DEMO-VEST-M', 'DEMO-VEST-L'],
    'demo-blouse': ['DEMO-BLUSA-S'],
  };
  return items.filter((item) => skus[productId]?.includes(item.sku)).map((item) => ({
    sku: item.sku, size: item.size, available: item.existing - item.reserved,
  }));
}

export type DemoAvailability = ReturnType<typeof getDemoAvailability>[number];
