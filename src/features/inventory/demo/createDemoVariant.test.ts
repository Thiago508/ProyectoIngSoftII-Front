import assert from 'node:assert/strict';
import test from 'node:test';
import { createDemoVariant } from './createDemoVariant.ts';
import { inventoryDemo } from './inventoryDemo.ts';
import { productsDemo } from '../../products/demo/productsDemo.ts';
import { getDemoAvailability } from '../../catalog/demo/catalogDemo.ts';

const draft = { productId: 'demo-dress', sku: ' nuevo-xl ', size: ' xl ' };

test('asocia por ID estable, normaliza SKU y talla y comienza sin existencias o reservas', () => {
  const before = JSON.stringify(inventoryDemo);
  const result = createDemoVariant(inventoryDemo, productsDemo, draft);
  assert.ok(result.ok);
  assert.deepEqual(result.item, { productId: 'demo-dress', name: 'Vestido midi estampado', sku: 'NUEVO-XL', size: 'XL', existing: 0, reserved: 0 });
  assert.equal(result.items.length, inventoryDemo.length + 1);
  assert.deepEqual(getDemoAvailability('demo-dress', result.items).at(-1), { sku: 'NUEVO-XL', size: 'XL', available: 0 });
  assert.equal(JSON.stringify(inventoryDemo), before);
});

test('rechaza campos vacíos, producto desconocido/inactivo, SKU duplicado y talla repetida', () => {
  const empty = createDemoVariant(inventoryDemo, productsDemo, { productId: '', sku: '', size: '' });
  assert.equal(empty.ok, false);
  if (!empty.ok) assert.deepEqual(Object.keys(empty.errors), ['productId', 'sku', 'size']);
  const cases = [
    { ...draft, productId: 'no-existe' },
    { ...draft, sku: ' demo-blusa-s ' },
    { ...draft, size: ' m ' },
  ];
  for (const value of cases) assert.equal(createDemoVariant(inventoryDemo, productsDemo, value).ok, false);
  assert.equal(createDemoVariant(inventoryDemo, productsDemo.map((product) => ({ ...product, active: false })), draft).ok, false);
});

test('el nombre y código comercial no determinan la asociación y productos distintos pueden compartir talla', () => {
  const products = productsDemo.map((product) => ({ ...product, name: 'Nombre actualizado', code: 'OTRO-CODIGO' }));
  const result = createDemoVariant(inventoryDemo, products, { productId: 'demo-blouse', sku: 'BLUSA-M', size: 'M' });
  assert.ok(result.ok);
  assert.equal(result.item.productId, 'demo-blouse');
  assert.equal(getDemoAvailability('demo-blouse', result.items).length, 2);
  assert.equal(getDemoAvailability('demo-dress', result.items).length, 2);
});
