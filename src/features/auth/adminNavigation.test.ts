import assert from 'node:assert/strict';
import test from 'node:test';
import { adminPaths, adminReturnPath } from './adminNavigation.ts';

test('solo admite destinos internos administrativos conocidos', () => {
  for (const path of adminPaths) assert.equal(adminReturnPath({ returnTo: path }), path);
  for (const state of [null, undefined, '/admin/products', {}, { returnTo: 'https://example.com' }, { returnTo: '//example.com' }, { returnTo: '/admin/products?next=https://example.com' }, { returnTo: '/catalog' }, { returnTo: '/admin/desconocida' }]) {
    assert.equal(adminReturnPath(state), null);
  }
});

test('retorno del carrito solo admite destinos internos exactos', async () => {
  const { loginReturnPath } = await import('./adminNavigation.ts');
  for (const path of ['/cart?source=api', '/catalog/7?source=api', '/admin/products']) assert.equal(loginReturnPath({ returnTo: path }), path);
  for (const path of ['https://example.com', '//example.com', '/cart?source=api&next=x', '/catalog/7?source=api#x', '/catalog/0?source=api']) assert.equal(loginReturnPath({ returnTo: path }), null);
});


test('conserva solo el selector de fuente permitido al volver a administración', () => {
  assert.equal(adminReturnPath({ returnTo: '/admin/products?source=api' }), '/admin/products?source=api');
  assert.equal(adminReturnPath({ returnTo: '/admin/products?source=demo' }), '/admin/products?source=demo');
  assert.equal(adminReturnPath({ returnTo: '/admin/products?source=api&next=x' }), null);
});


test('retorno a notificaciones admite solo la bandeja interna prevista', async () => {
  const { loginReturnPath } = await import('./adminNavigation.ts');
  assert.equal(loginReturnPath({ returnTo: '/notifications?source=api' }), '/notifications?source=api');
  assert.equal(loginReturnPath({ returnTo: '/notifications?source=api&next=https://example.com' }), null);
});


test('retorno de pedidos permite consulta interna y rechaza destinos externos', async () => {
  const { loginReturnPath } = await import('./adminNavigation.ts');
  assert.equal(loginReturnPath({ returnTo: '/orders?source=api' }), '/orders?source=api');
  assert.equal(loginReturnPath({ returnTo: '/orders/7?source=api' }), '/orders/7?source=api');
  assert.equal(loginReturnPath({ returnTo: '/orders/7?source=api&next=x' }), null);
});


test('retorno al pago solo admite el destino interno previsto', async () => {
  const { loginReturnPath } = await import('./adminNavigation.ts');
  assert.equal(loginReturnPath({ returnTo: '/orders/7/payment?source=api' }), '/orders/7/payment?source=api');
  assert.equal(loginReturnPath({ returnTo: '/orders/7/payment?source=api&next=x' }), null);
});
