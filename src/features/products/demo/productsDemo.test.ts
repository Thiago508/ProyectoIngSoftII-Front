import { createDemoOrder } from '../../checkout/demo/createDemoOrder.ts';
import assert from 'node:assert/strict';
import test from 'node:test';
import { createDemoProduct, updateDemoProduct, deactivateDemoProduct, productsDemo } from './productsDemo.ts';

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


test('SWR-12 edita conservando ID y valida unicidad sin confundirse con el propio producto', () => {
  const before = structuredClone(productsDemo);
  const product = productsDemo[0];
  const result = updateDemoProduct(productsDemo, product.id, { ...draft, code: product.code });
  assert.ok(result.ok);
  assert.equal(result.product.id, product.id);
  assert.equal(result.products.length, productsDemo.length);
  assert.equal(result.product.name, 'Blusa nueva');
  assert.equal(result.product.priceCents, 8990050);
  assert.equal(updateDemoProduct(productsDemo, product.id, { ...draft, code: productsDemo[1].code }).ok, false);
  assert.equal(updateDemoProduct(productsDemo, 'unknown', draft).ok, false);
  assert.equal(updateDemoProduct(productsDemo, '', draft).ok, false);
  assert.deepEqual(productsDemo, before);
});

test('SWR-13 desactiva sin borrar y editar no reactiva el producto', () => {
  const before = structuredClone(productsDemo);
  const inactive = deactivateDemoProduct(productsDemo, productsDemo[0].id);
  assert.ok(inactive.ok);
  assert.equal(inactive.products.length, productsDemo.length);
  assert.equal(inactive.product.active, false);
  assert.equal(inactive.product.id, productsDemo[0].id);
  assert.equal(inactive.product.priceCents, productsDemo[0].priceCents);
  const edited = updateDemoProduct(inactive.products, inactive.product.id, draft);
  assert.ok(edited.ok);
  assert.equal(edited.product.active, false);
  assert.equal(deactivateDemoProduct(productsDemo, 'unknown').ok, false);
  assert.deepEqual(productsDemo, before);
});


test('SWR-14 cambiar precio/nombre o desactivar no altera las líneas del pedido registrado', async () => {
  const product = productsDemo[0];
  const order = await createDemoOrder({ fullName: 'Karen Martínez', email: 'karen@example.com', phone: '3001234567', address: 'Calle 14 # 23 - 45', city: 'Armenia', department: 'Quindío' }, [
    { id: product.id, name: product.name, size: 'M', unitPrice: product.priceCents / 100, quantity: 1 },
  ]);
  const snapshot = structuredClone(order);
  const updated = updateDemoProduct(productsDemo, product.id, { ...draft, code: product.code, price: '99900' });
  assert.ok(updated.ok);
  assert.ok(deactivateDemoProduct(updated.products, product.id).ok);
  assert.deepEqual(order, snapshot);
  assert.equal(order.items[0].unitPrice, 89900);
  assert.equal(order.items[0].name, 'Vestido midi estampado');
});
