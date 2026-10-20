import assert from 'node:assert/strict';
import test from 'node:test';
import { addCartItem, cartSubtotalCents, updateCartQuantity, removeCartItem } from './cart.ts';
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


test('SWR-20 modifica solo la línea indicada y rechaza cantidades inválidas sin mutar', () => {
  const initial = addCartItem(productsDemo, [], 'demo-dress', 'DEMO-VEST-M', '2');
  assert.ok(initial.ok);
  const before = structuredClone(initial.lines);
  for (const quantity of ['', '0', '-1', '1.5', '1e3', '9007199254740992']) {
    assert.equal(updateCartQuantity(productsDemo, initial.lines, 'demo-dress', 'DEMO-VEST-M', quantity).ok, false);
  }
  const updated = updateCartQuantity(productsDemo, initial.lines, 'demo-dress', 'DEMO-VEST-M', ' 4 ');
  assert.ok(updated.ok);
  assert.equal(updated.lines[0].quantity, 4);
  assert.equal(cartSubtotalCents(updated.lines, productsDemo), 35960000);
  assert.deepEqual(initial.lines, before);
  assert.equal(updateCartQuantity(productsDemo, initial.lines, 'unknown', 'DEMO-VEST-M', '2').ok, false);
});

test('retira una sola variante, incluso inactiva, y no modifica inventario al editar o retirar', () => {
  const initial = addCartItem(productsDemo, [], 'demo-dress', 'DEMO-VEST-M', '2');
  assert.ok(initial.ok);
  const both = addCartItem(productsDemo, initial.lines, 'demo-blouse', 'DEMO-BLUSA-S', '1');
  assert.ok(both.ok);
  const inventoryBefore = structuredClone(inventoryDemo);
  const productsBefore = structuredClone(productsDemo);
  const inactive = productsDemo.map((product) => ({ ...product, active: false }));
  assert.equal(updateCartQuantity(inactive, both.lines, 'demo-dress', 'DEMO-VEST-M', '3').ok, false);
  const removed = removeCartItem(both.lines, 'demo-dress', 'DEMO-VEST-M');
  assert.ok(removed.ok);
  assert.deepEqual(removed.lines, [both.lines[1]]);
  const empty = removeCartItem(removed.lines, 'demo-blouse', 'DEMO-BLUSA-S');
  assert.ok(empty.ok);
  assert.deepEqual(empty.lines, []);
  assert.equal(cartSubtotalCents(empty.lines, productsDemo), 0);
  assert.equal(removeCartItem(empty.lines, 'demo-blouse', 'DEMO-BLUSA-S').ok, false);
  updateCartQuantity(productsDemo, both.lines, 'demo-dress', 'DEMO-VEST-M', '4');
  assert.deepEqual(inventoryDemo, inventoryBefore);
  assert.deepEqual(productsDemo, productsBefore);
  assert.equal(both.lines.length, 2);
});

test('checkout usa SKU, cantidades y centavos actuales; rechaza variantes e inactivos sin alterar inventario', async () => {
  const { prepareCheckoutCart } = await import('./checkoutCart.ts');
  const inventory = JSON.stringify(inventoryDemo);
  const line = { productId: 'demo-dress', sku: 'DEMO-VEST-M', size: 'M', quantity: 2 };
  const products = productsDemo.map((product) => ({ ...product, priceCents: 12345 }));
  const items = prepareCheckoutCart([line], products);
  assert.deepEqual(items, [{ id: 'DEMO-VEST-M', name: 'Vestido midi estampado', size: 'M', quantity: 2, unitPrice: 123.45 }]);
  products[0].name = 'Otro nombre';
  assert.equal(items[0].name, 'Vestido midi estampado');
  assert.deepEqual(prepareCheckoutCart([], products), []);
  assert.throws(() => prepareCheckoutCart([{ ...line, quantity: 13 }], products));
  assert.throws(() => prepareCheckoutCart([{ ...line, size: 'L' }], products));
  assert.throws(() => prepareCheckoutCart([line], products.map((product) => ({ ...product, active: false }))));
  assert.equal(JSON.stringify(inventoryDemo), inventory);
});

test('el subtotal de checkout conserva centavos del catálogo', async () => {
  const { calculateSubtotal } = await import('../checkout/demo/createDemoOrder.ts');
  assert.equal(calculateSubtotal([{ id: 'sku', name: 'Producto', size: 'M', quantity: 3, unitPrice: 123.45 }]), 370.35);
});

test('agregar y confirmar consultan el inventario suministrado y no modifican sus cantidades', async () => {
  const { prepareCheckoutCart } = await import('./checkoutCart.ts');
  const items = inventoryDemo.map((item) => item.sku === 'DEMO-VEST-M' ? { ...item, existing: 6 } : { ...item });
  const before = JSON.stringify(items);
  const line = { productId: 'demo-dress', sku: 'DEMO-VEST-M', size: 'M', quantity: 4 };
  assert.throws(() => prepareCheckoutCart([line], productsDemo, items));
  assert.equal(prepareCheckoutCart([{ ...line, quantity: 3 }], productsDemo, items)[0].quantity, 3);
  const zero = items.map((item) => ({ ...item, existing: item.reserved }));
  assert.equal(addCartItem(productsDemo, [], 'demo-dress', 'DEMO-VEST-M', '1', zero).ok, false);
  assert.equal(addCartItem(productsDemo, [], 'demo-dress', 'DEMO-VEST-M', '1', items).ok, true);
  assert.equal(JSON.stringify(items), before);
});
