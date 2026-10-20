export interface InventoryItem {
  productId?: string;
  sku: string;
  name: string;
  size: string;
  existing: number;
  reserved: number;
}

// Artículos vendibles de demostración, compartidos con catálogo y checkout.
// La falda conserva un ejemplo sin producto comercial asociado.
// Cada talla tiene un identificador distinto. Las reservas solo ilustran SWR-06.
export const inventoryDemo: readonly InventoryItem[] = [
  { productId: 'demo-dress', sku: 'DEMO-VEST-M', name: 'Vestido midi estampado', size: 'M', existing: 15, reserved: 3 },
  { productId: 'demo-dress', sku: 'DEMO-VEST-L', name: 'Vestido midi estampado', size: 'L', existing: 8, reserved: 8 },
  { productId: 'demo-blouse', sku: 'DEMO-BLUSA-S', name: 'Blusa manga larga', size: 'S', existing: 25, reserved: 0 },
  { sku: 'DEMO-FALDA-M', name: 'Falda plisada', size: 'M', existing: 0, reserved: 0 },
];
