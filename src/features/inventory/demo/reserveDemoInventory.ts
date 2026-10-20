import type { InventoryItem } from './inventoryDemo';

export interface ReservationLine { sku: string; quantity: number }
export interface ReservationOrder { id: string; lines: readonly ReservationLine[] }
export interface DemoReservation { orderId: string; lines: ReservationLine[]; createdAt: string; status: 'active' | 'cancelled' | 'expired' | 'converted'; releasedAt?: string; convertedAt?: string }

export const reservationOrders: readonly ReservationOrder[] = [
  { id: 'DEMO-PED-001', lines: [{ sku: 'DEMO-VEST-M', quantity: 2 }, { sku: 'DEMO-BLUSA-S', quantity: 1 }] },
  { id: 'DEMO-PED-002', lines: [{ sku: 'DEMO-BLUSA-S', quantity: 1 }, { sku: 'DEMO-FALDA-M', quantity: 1 }] },
];

type ReservationResult = { ok: false; message: string } | {
  ok: true;
  items: InventoryItem[];
  reservations: DemoReservation[];
  repeated: boolean;
};

// Modelo local: ilustra todo-o-nada y repetición sin garantizar transacciones reales.
export function reserveDemoInventory(items: readonly InventoryItem[], reservations: readonly DemoReservation[],
  order: ReservationOrder): ReservationResult {
  if (!order.id || !order.lines.length) return { ok: false, message: 'El pedido de demostración no tiene líneas válidas.' };
  const previousReservation = reservations.find((reservation) => reservation.orderId === order.id);
  if (previousReservation && previousReservation.status !== 'active') {
    return { ok: false, message: 'Este pedido de demostración ya tiene una reserva terminada. No se crea una nueva reserva para el mismo pedido.' };
  }
  if (previousReservation) {
    return { ok: true, items: [...items], reservations: [...reservations], repeated: true };
  }
  const quantities = new Map<string, number>();
  for (const line of order.lines) {
    if (!Number.isSafeInteger(line.quantity) || line.quantity <= 0) return { ok: false, message: 'Las cantidades del pedido deben ser enteras mayores que cero.' };
    const accumulated = (quantities.get(line.sku) ?? 0) + line.quantity;
    if (!Number.isSafeInteger(accumulated)) return { ok: false, message: 'La cantidad solicitada no es válida.' };
    quantities.set(line.sku, accumulated);
  }
  for (const [sku, quantity] of quantities) {
    const item = items.find((candidate) => candidate.sku === sku);
    if (!item) return { ok: false, message: `Artículo desconocido: ${sku}. No se reservó ninguna línea.` };
    if (quantity > item.existing - item.reserved) return {
      ok: false, message: `${item.name}, talla ${item.size}: se solicitan ${quantity} y hay ${item.existing - item.reserved} disponibles. No se reservó ninguna línea.`,
    };
  }
  const lines = [...quantities].map(([sku, quantity]) => ({ sku, quantity }));
  return {
    ok: true,
    items: items.map((item) => ({ ...item, reserved: item.reserved + (quantities.get(item.sku) ?? 0) })),
    reservations: [...reservations, { orderId: order.id, lines, status: 'active', createdAt: new Date().toISOString() }],
    repeated: false,
  };
}
