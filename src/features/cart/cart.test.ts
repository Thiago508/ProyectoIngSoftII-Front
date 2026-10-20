import assert from 'node:assert/strict';
import test from 'node:test';
import { addCartItem, cartSubtotalCents } from './cart.ts';
import { productsDemo } from '../products/demo/productsDemo.ts';
import { inventoryDemo } from '../inventory/demo/inventoryDemo.ts';

test('SWR-19 agrega talla y cantidad; repeticiones suman sin duplicar línea', () => {
  const result = addCartItem(productsDemo, [], 'demo-dress', 'DEMO-VEST-M', '2');
  assert.ok(result.ok);
  assert.deepEqual(result.lines, [{ productId: 'demo-dress', sku: 'DEMO-VEST-M', size: 'M', quantity: 2 }]);
  const second = addCartItem(productsDemo, result.lines, 'demo-dress', 'DEMO-VEST-M', ' 1 ');
  assert.ok(second.ok);
  assert.equal(second.lines.length, 1);
  assert.equal(second.lines[0].quantity, 3);
  assert.equal(result.lines[0].quantity, 2);
});

test('rechaza producto inactivo, talla ajena/no disponible y cantidades inválidas', () => {
  assert.equal(addCartItem(productsDemo.map((product) => ({ ...product, active: false })), [], 'demo-dress', 'DEMO-VEST-M', '1').ok, false);
  for (const sku of ['', 'DEMO-BLUSA-S', 'DEMO-VEST-L']) assert.equal(addCartItem(productsDemo, [], 'demo-dress', sku, '1').ok, false);
  for (const quantity of ['', '-1', '0', '1.5', '1e3', '9007199254740992']) assert.equal(addCartItem(productsDemo, [], 'demo-dress', 'DEMO-VEST-M', quantity).ok, false);
});

test('SWR-21 calcula subtotal de varias líneas y rechaza cantidades sin precisión segura', () => {
  const dress = addCartItem(productsDemo, [], 'demo-dress', 'DEMO-VEST-M', '2');
  assert.ok(dress.ok);
  const both = addCartItem(productsDemo, dress.lines, 'demo-blouse', 'DEMO-BLUSA-S', '1');
  assert.ok(both.ok);
  assert.equal(cartSubtotalCents(both.lines, productsDemo), 23970000);
  assert.equal(cartSubtotalCents([], productsDemo), 0);
  assert.equal(addCartItem(productsDemo, both.lines, 'demo-dress', 'DEMO-VEST-M', '9007199254740991').ok, false);
});

test('SWR-22 agregar conserva productos e inventario sin reservas ni descuentos', () => {
  const products = structuredClone(productsDemo);
  const inventory = structuredClone(inventoryDemo);
  addCartItem(productsDemo, [], 'demo-dress', 'DEMO-VEST-M', '2');
  assert.deepEqual(productsDemo, products);
  assert.deepEqual(inventoryDemo, inventory);
});
