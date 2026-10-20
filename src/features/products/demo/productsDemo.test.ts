import assert from 'node:assert/strict';
import test from 'node:test';
import { createDemoProduct, productsDemo } from './productsDemo.ts';

const draft = { code: ' NUEVO-01 ', name: ' Blusa nueva ', description: ' Descripción de prueba ', price: '89900,50' };

test('SWR-11 crea producto activo normalizado sin modificar los ejemplos', () => {
  const before = structuredClone(productsDemo);
  const result = createDemoProduct(productsDemo, draft);
  assert.ok(result.ok);
  assert.equal(result.product.code, 'NUEVO-01');
  assert.equal(result.product.name, 'Blusa nueva');
  assert.equal(result.product.description, 'Descripción de prueba');
  assert.equal(result.product.priceCents, 8990050);
  assert.equal(result.product.active, true);
  assert.equal(result.products.length, productsDemo.length + 1);
  assert.deepEqual(productsDemo, before);
});

test('identificador comercial único incluso con espacios y diferencias de mayúsculas', () => {
  const result = createDemoProduct(productsDemo, { ...draft, code: ' demo-vest ' });
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.code);
});

test('rechaza campos vacíos y precios cero, negativos, inválidos o sin precisión segura', () => {
  const empty = createDemoProduct(productsDemo, { code: ' ', name: '', description: ' ', price: '' });
  assert.equal(empty.ok, false);
  if (!empty.ok) assert.deepEqual(Object.keys(empty.errors), ['code', 'name', 'description', 'price']);
  for (const price of ['0', '-1', '1e3', 'abc', '89.900,50', '1.234', '9007199254740992']) {
    assert.equal(createDemoProduct(productsDemo, { ...draft, price }).ok, false);
  }
  for (const price of ['0.01', '0,01', '89900', '89900.50']) {
    assert.equal(createDemoProduct(productsDemo, { ...draft, price }).ok, true);
  }
});
