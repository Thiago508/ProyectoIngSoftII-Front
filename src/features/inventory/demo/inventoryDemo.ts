export interface InventoryItem {
  sku: string;
  name: string;
  size: string;
  existing: number;
  reserved: number;
}

// Artículos vendibles de demostración. No consultan ni alteran stock del checkout.
// Cada talla tiene un identificador distinto. Las reservas solo ilustran SWR-06.
export const inventoryDemo: readonly InventoryItem[] = [
  { sku: 'DEMO-VEST-M', name: 'Vestido midi estampado', size: 'M', existing: 15, reserved: 3 },
  { sku: 'DEMO-VEST-L', name: 'Vestido midi estampado', size: 'L', existing: 8, reserved: 8 },
  { sku: 'DEMO-BLUSA-S', name: 'Blusa manga larga', size: 'S', existing: 25, reserved: 0 },
  { sku: 'DEMO-FALDA-M', name: 'Falda plisada', size: 'M', existing: 0, reserved: 0 },
];
