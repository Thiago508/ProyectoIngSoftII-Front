import { inventoryDemo, type InventoryItem } from './inventoryDemo';
import type { InventoryAdjustment } from './adjustDemoInventory';
import type { DemoReservation } from './reserveDemoInventory';

export interface InventorySession {
  items: InventoryItem[];
  history: InventoryAdjustment[];
  reservations: DemoReservation[];
}

export function createDemoInventorySession(): InventorySession {
  return { items: inventoryDemo.map((item) => ({ ...item })), history: [], reservations: [] };
}
