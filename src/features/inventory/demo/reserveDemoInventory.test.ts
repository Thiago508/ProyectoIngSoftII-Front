import assert from 'node:assert/strict';
import test from 'node:test';
import { inventoryDemo } from './inventoryDemo.ts';
import { reservationOrders, reserveDemoInventory } from './reserveDemoInventory.ts';

test('SWR-08 reserva todas las líneas sin descontar existencias ni mutar entradas', () => {
  const original = structuredClone(inventoryDemo);
  const result = reserveDemoInventory(inventoryDemo, [], reservationOrders[0]);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.items[0].reserved, 5);
  assert.equal(result.items[2].reserved, 1);
  assert.deepEqual(result.items.map((item) => item.existing), original.map((item) => item.existing));
  assert.equal(result.reservations.length, 1);
  assert.deepEqual(inventoryDemo, original);
  const again = reserveDemoInventory(result.items, result.reservations, reservationOrders[0]);
  assert.equal(again.ok, true);
  if (!again.ok) return;
  assert.equal(again.repeated, true);
  assert.deepEqual(again.items, result.items);
  assert.deepEqual(again.reservations, result.reservations);
});

test('rechazo en una línea no aplica ninguna reserva parcial', () => {
  const original = structuredClone(inventoryDemo);
  const result = reserveDemoInventory(inventoryDemo, [], reservationOrders[1]);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.message, /No se reservó ninguna línea/);
  assert.deepEqual(inventoryDemo, original);
});

test('agrega líneas del mismo SKU antes de comprobar disponibilidad', () => {
  const result = reserveDemoInventory(inventoryDemo, [], { id: 'duplicate-lines', lines: [
    { sku: 'DEMO-VEST-M', quantity: 7 }, { sku: 'DEMO-VEST-M', quantity: 6 },
  ] });
  assert.equal(result.ok, false);
});

test('permite reservar exactamente lo disponible y rechaza cantidades inválidas o SKU desconocido', () => {
  const boundary = reserveDemoInventory(inventoryDemo, [], { id: 'boundary', lines: [{ sku: 'DEMO-VEST-M', quantity: 12 }] });
  assert.equal(boundary.ok, true);
  if (boundary.ok) assert.equal(boundary.items[0].existing - boundary.items[0].reserved, 0);
  for (const quantity of [0, -1, 1.5, NaN]) {
    assert.equal(reserveDemoInventory(inventoryDemo, [], { id: 'invalid', lines: [{ sku: 'DEMO-VEST-M', quantity }] }).ok, false);
  }
  assert.equal(reserveDemoInventory(inventoryDemo, [], { id: 'unknown', lines: [{ sku: 'unknown', quantity: 1 }] }).ok, false);
  assert.equal(reserveDemoInventory(inventoryDemo, [], { id: 'empty', lines: [] }).ok, false);
});
