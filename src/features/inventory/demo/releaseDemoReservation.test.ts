import assert from 'node:assert/strict';
import test from 'node:test';
import { inventoryDemo } from './inventoryDemo.ts';
import { reserveDemoInventory, reservationOrders } from './reserveDemoInventory.ts';
import { releaseDemoReservation } from './releaseDemoReservation.ts';

for (const reason of ['cancelled', 'expired'] as const) {
  test(`SWR-09 libera una vez por ${reason} y preserva reservas ajenas y existencias`, () => {
    const reserved = reserveDemoInventory(inventoryDemo, [], reservationOrders[0]);
    assert.ok(reserved.ok);
    const before = structuredClone(reserved);
    const released = releaseDemoReservation(reserved.items, reserved.reservations, reservationOrders[0].id, reason);
    assert.ok(released.ok);
    assert.deepEqual(released.items, inventoryDemo);
    assert.equal(released.reservations[0].status, reason);
    assert.ok(released.reservations[0].releasedAt);
    assert.deepEqual(reserved, before);
    const repeated = releaseDemoReservation(released.items, released.reservations, reservationOrders[0].id, reason === 'cancelled' ? 'expired' : 'cancelled');
    assert.ok(repeated.ok);
    assert.equal(repeated.repeated, true);
    assert.deepEqual(repeated.items, released.items);
    assert.deepEqual(repeated.reservations, released.reservations);
    assert.equal(reserveDemoInventory(released.items, released.reservations, reservationOrders[0]).ok, false);
  });
}

test('rechaza reserva inexistente e inconsistencias sin liberar parcialmente', () => {
  assert.equal(releaseDemoReservation(inventoryDemo, [], 'unknown', 'cancelled').ok, false);
  const reserved = reserveDemoInventory(inventoryDemo, [], reservationOrders[0]);
  assert.ok(reserved.ok);
  const inconsistent = reserved.items.map((item) => item.sku === 'DEMO-BLUSA-S' ? { ...item, reserved: 0 } : { ...item });
  const before = structuredClone(inconsistent);
  const result = releaseDemoReservation(inconsistent, reserved.reservations, reservationOrders[0].id, 'expired');
  assert.equal(result.ok, false);
  assert.deepEqual(inconsistent, before);
  assert.equal(reserved.reservations[0].status, 'active');
});
