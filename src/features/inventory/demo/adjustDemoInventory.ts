import type { InventoryItem } from './inventoryDemo';

export interface InventoryAdjustment {
  id: string;
  sku: string;
  name: string;
  size: string;
  previousQuantity: number;
  newQuantity: number;
  reason: string;
  actor: string;
  createdAt: string;
}

export type AdjustmentErrors = Partial<Record<'sku' | 'quantity' | 'reason', string>>;

type AdjustmentResult = { ok: false; errors: AdjustmentErrors } | {
  ok: true;
  items: InventoryItem[];
  adjustment: InventoryAdjustment;
};

// Simulación local: no autoriza usuarios ni representa un contrato de backend.
export function adjustDemoInventory(items: readonly InventoryItem[], sku: string,
  quantity: string, reason: string): AdjustmentResult {
  const item = items.find((candidate) => candidate.sku === sku);
  const errors: AdjustmentErrors = {};
  const normalizedQuantity = quantity.trim();
  const nextQuantity = Number(normalizedQuantity);
  if (!item) errors.sku = 'Selecciona un artículo válido.';
  if (!/^\d+$/.test(normalizedQuantity) || !Number.isSafeInteger(nextQuantity)) {
    errors.quantity = 'Escribe una cantidad entera mayor o igual a cero.';
  } else if (item && nextQuantity < item.reserved) {
    errors.quantity = `La cantidad no puede ser inferior a las ${item.reserved} unidades reservadas.`;
  }
  if (!reason.trim()) errors.reason = 'Indica el motivo del ajuste.';
  if (!item || Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    items: items.map((candidate) => candidate.sku === sku ? { ...candidate, existing: nextQuantity } : { ...candidate }),
    adjustment: {
      id: crypto.randomUUID(), sku: item.sku, name: item.name, size: item.size,
      previousQuantity: item.existing, newQuantity: nextQuantity, reason: reason.trim(),
      actor: 'Administrador de demostración', createdAt: new Date().toISOString(),
    },
  };
}
