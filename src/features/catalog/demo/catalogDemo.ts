import type { Product } from '../../products/demo/productsDemo';
import { inventoryDemo } from '../../inventory/demo/inventoryDemo.ts';

export function filterActiveProducts(products: readonly Product[], query: string): Product[] {
  const search = query.trim().toLocaleLowerCase('es-CO');
  return products.filter((product) => product.active && product.name.toLocaleLowerCase('es-CO').includes(search));
}

// Asociación explícita entre ejemplos; no es un contrato de catálogo/inventario.
// Los ajustes locales de la pantalla de Inventario no alimentan esta instantánea.
export function getDemoAvailability(productId: string) {
  const skus: Readonly<Record<string, readonly string[]>> = {
    'demo-dress': ['DEMO-VEST-M', 'DEMO-VEST-L'],
    'demo-blouse': ['DEMO-BLUSA-S'],
  };
  return inventoryDemo.filter((item) => skus[productId]?.includes(item.sku)).map((item) => ({
    sku: item.sku, size: item.size, available: item.existing - item.reserved,
  }));
}
