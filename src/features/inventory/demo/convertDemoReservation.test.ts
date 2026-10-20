import assert from 'node:assert/strict';
import test from 'node:test';
import { inventoryDemo } from './inventoryDemo.ts';
import { reservationOrders, reserveDemoInventory } from './reserveDemoInventory.ts';
import { releaseDemoReservation } from './releaseDemoReservation.ts';
import { convertDemoReservation } from './convertDemoReservation.ts';

test('SWR-10 convierte una vez, conserva disponible y no afecta reservas ajenas', () => {
  const active = reserveDemoInventory(inventoryDemo, [], reservationOrders[0]);
  assert.ok(active.ok);
  const before = structuredClone(active);
  const result = convertDemoReservation(active.items, active.reservations, reservationOrders[0].id);
  assert.ok(result.ok);
  assert.equal(result.items[0].existing, 13);
  assert.equal(result.items[0].reserved, 3);
  assert.equal(result.items[2].existing, 24);
  assert.equal(result.items[2].reserved, 0);
  assert.deepEqual(result.items.map((item) => item.existing - item.reserved), active.items.map((item) => item.existing - item.reserved));
  assert.equal(result.reservations[0].status, 'converted');
  assert.ok(result.reservations[0].convertedAt);
  assert.deepEqual(active, before);
  const repeated = convertDemoReservation(result.items, result.reservations, reservationOrders[0].id);
  assert.ok(repeated.ok);
  assert.equal(repeated.repeated, true);
  assert.deepEqual(repeated.items, result.items);
  assert.deepEqual(repeated.reservations, result.reservations);
  assert.equal(releaseDemoReservation(result.items, result.reservations, reservationOrders[0].id, 'cancelled').ok, false);
  assert.equal(releaseDemoReservation(result.items, result.reservations, reservationOrders[0].id, 'expired').ok, false);
  assert.equal(reserveDemoInventory(result.items, result.reservations, reservationOrders[0]).ok, false);
});

for (const reason of ['cancelled', 'expired'] as const) {
  test(`rechaza salida con reserva ${reason}`, () => {
    const active = reserveDemoInventory(inventoryDemo, [], reservationOrders[0]);
    assert.ok(active.ok);
    const released = releaseDemoReservation(active.items, active.reservations, reservationOrders[0].id, reason);
    assert.ok(released.ok);
    const before = structuredClone(released);
    assert.equal(convertDemoReservation(released.items, released.reservations, reservationOrders[0].id).ok, false);
    assert.deepEqual(released, before);
  });
}

test('rechaza reserva inexistente e inventario inconsistente sin salida parcial', () => {
  assert.equal(convertDemoReservation(inventoryDemo, [], 'unknown').ok, false);
  const active = reserveDemoInventory(inventoryDemo, [], reservationOrders[0]);
  assert.ok(active.ok);
  const inconsistent = active.items.map((item) => item.sku === 'DEMO-BLUSA-S' ? { ...item, reserved: 0 } : { ...item });
  const before = structuredClone(inconsistent);
  assert.equal(convertDemoReservation(inconsistent, active.reservations, reservationOrders[0].id).ok, false);
  assert.deepEqual(inconsistent, before);
  assert.equal(active.reservations[0].status, 'active');
});
