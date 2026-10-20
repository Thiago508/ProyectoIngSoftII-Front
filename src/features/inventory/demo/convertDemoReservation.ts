import type { InventoryItem } from './inventoryDemo';
import type { DemoReservation } from './reserveDemoInventory';

type ConversionResult = { ok: false; message: string } | {
  ok: true;
  items: InventoryItem[];
  reservations: DemoReservation[];
  repeated: boolean;
};

// Simula la recepción de un evento confirmado. No verifica ni procesa pagos reales.
export function convertDemoReservation(items: readonly InventoryItem[], reservations: readonly DemoReservation[],
  orderId: string): ConversionResult {
  const reservation = reservations.find((candidate) => candidate.orderId === orderId);
  if (!reservation) return { ok: false, message: 'No hay una reserva registrada para este pedido. No se descontaron existencias.' };
  if (reservation.status === 'converted') return { ok: true, items: [...items], reservations: [...reservations], repeated: true };
  if (reservation.status !== 'active') return { ok: false, message: 'La reserva ya fue cancelada o expirada. No se descontaron existencias.' };
  for (const line of reservation.lines) {
    const item = items.find((candidate) => candidate.sku === line.sku);
    if (!item || !Number.isSafeInteger(line.quantity) || line.quantity <= 0 || item.reserved < line.quantity || item.existing < item.reserved) {
      return { ok: false, message: 'La reserva no coincide con el inventario simulado. No se aplicó ninguna salida.' };
    }
  }
  const convertedAt = new Date().toISOString();
  return {
    ok: true,
    items: items.map((item) => {
      const quantity = reservation.lines.find((line) => line.sku === item.sku)?.quantity ?? 0;
      return { ...item, existing: item.existing - quantity, reserved: item.reserved - quantity };
    }),
    reservations: reservations.map((candidate) => candidate.orderId === orderId ? { ...candidate, status: 'converted', convertedAt } : candidate),
    repeated: false,
  };
}
