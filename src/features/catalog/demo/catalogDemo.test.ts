import assert from 'node:assert/strict';
import test from 'node:test';
import { filterActiveProducts, getDemoAvailability } from './catalogDemo.ts';
import { productsDemo } from '../../products/demo/productsDemo.ts';

test('SWR-15 y SWR-17 filtran activos por coincidencia parcial sin distinguir mayúsculas', () => {
  const products = [...productsDemo, { ...productsDemo[0], id: 'inactive', active: false }];
  assert.equal(filterActiveProducts(products, '').length, 2);
  assert.deepEqual(filterActiveProducts(products, ' MIDI ').map((product) => product.id), ['demo-dress']);
  assert.equal(filterActiveProducts(products, 'blUsA').length, 1);
  assert.equal(filterActiveProducts(products, 'inexistente').length, 0);
});

test('SWR-16 muestra disponibilidad por talla a partir del ejemplo y no inventa stock nuevo', () => {
  assert.deepEqual(getDemoAvailability('demo-dress'), [
    { sku: 'DEMO-VEST-M', size: 'M', available: 12 },
    { sku: 'DEMO-VEST-L', size: 'L', available: 0 },
  ]);
  assert.deepEqual(getDemoAvailability('new-product'), []);
});
