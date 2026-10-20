import assert from 'node:assert/strict';
import test from 'node:test';
import { adjustDemoInventory } from './adjustDemoInventory.ts';
import { inventoryDemo } from './inventoryDemo.ts';

test('SWR-07 rechaza cantidades no enteras, negativas y valores no seguros', () => {
  for (const quantity of ['', ' ', '-1', '1.5', '1,5', '1e3', 'abc', '9007199254740992']) {
    const result = adjustDemoInventory(inventoryDemo, 'DEMO-BLUSA-S', quantity, 'Conteo físico');
    assert.equal(result.ok, false);
    if (!result.ok) assert.ok(result.errors.quantity);
  }
});

test('rechaza cantidades inferiores a reservado; permite el límite y cero sin reservas', () => {
  assert.equal(adjustDemoInventory(inventoryDemo, 'DEMO-VEST-M', '2', 'Conteo').ok, false);
  const boundary = adjustDemoInventory(inventoryDemo, 'DEMO-VEST-M', '3', 'Conteo');
  assert.equal(boundary.ok, true);
  if (boundary.ok) assert.equal(boundary.items[0].existing - boundary.items[0].reserved, 0);
  assert.equal(adjustDemoInventory(inventoryDemo, 'DEMO-BLUSA-S', '0', 'Conteo').ok, true);
});

test('rechaza artículo desconocido y motivo vacío sin modificar los datos', () => {
  const before = structuredClone(inventoryDemo);
  const result = adjustDemoInventory(inventoryDemo, 'unknown', '5', '   ');
  assert.equal(result.ok, false);
  if (!result.ok) { assert.ok(result.errors.sku); assert.ok(result.errors.reason); }
  assert.deepEqual(inventoryDemo, before);
});

test('registra valores anterior/nuevo, motivo normalizado, usuario y fecha sin alterar reservas', () => {
  const before = structuredClone(inventoryDemo);
  const result = adjustDemoInventory(inventoryDemo, 'DEMO-VEST-M', ' 20 ', ' Conteo físico ');
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.adjustment.previousQuantity, 15);
  assert.equal(result.adjustment.newQuantity, 20);
  assert.equal(result.adjustment.reason, 'Conteo físico');
  assert.equal(result.adjustment.actor, 'Administrador de demostración');
  assert.ok(Number.isFinite(Date.parse(result.adjustment.createdAt)));
  assert.ok(result.adjustment.id);
  assert.equal(result.items[0].reserved, 3);
  assert.equal(result.items[0].existing, 20);
  assert.deepEqual(result.items.slice(1), inventoryDemo.slice(1));
  assert.deepEqual(inventoryDemo, before);
});
