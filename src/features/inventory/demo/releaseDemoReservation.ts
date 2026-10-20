import type { InventoryItem } from './inventoryDemo';
import type { DemoReservation } from './reserveDemoInventory';

export type ReleaseReason = 'cancelled' | 'expired';
type ReleaseResult = { ok: false; message: string } | {
  ok: true;
  items: InventoryItem[];
  reservations: DemoReservation[];
  repeated: boolean;
};

// Evento manual de laboratorio: no calcula vencimientos ni cancela pedidos reales.
export function releaseDemoReservation(items: readonly InventoryItem[], reservations: readonly DemoReservation[],
  orderId: string, reason: ReleaseReason): ReleaseResult {
  const reservation = reservations.find((candidate) => candidate.orderId === orderId);
  if (!reservation) return { ok: false, message: 'No hay una reserva registrada para este pedido. No se modificó el inventario.' };
  if (reservation.status === 'converted') return { ok: false, message: 'La reserva ya se convirtió en salida simulada. No puede liberarse ni devolver existencias desde este laboratorio.' };
  if (reservation.status !== 'active') return { ok: true, items: [...items], reservations: [...reservations], repeated: true };
  for (const line of reservation.lines) {
    const item = items.find((candidate) => candidate.sku === line.sku);
    if (!item || !Number.isSafeInteger(line.quantity) || line.quantity <= 0 || item.reserved < line.quantity) {
      return { ok: false, message: 'La reserva no coincide con el inventario simulado. No se liberó ninguna línea.' };
    }
  }
  const releasedAt = new Date().toISOString();
  return {
    ok: true,
    items: items.map((item) => ({ ...item, reserved: item.reserved - (reservation.lines.find((line) => line.sku === item.sku)?.quantity ?? 0) })),
    reservations: reservations.map((candidate) => candidate.orderId === orderId ? { ...candidate, status: reason, releasedAt } : candidate),
    repeated: false,
  };
}
