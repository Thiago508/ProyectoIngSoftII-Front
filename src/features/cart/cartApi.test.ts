import assert from 'node:assert/strict';
import test from 'node:test';
import { createApiClient } from '../../shared/api/apiClient.ts';
import { cartQuantity, readApiCart, requestCart } from './cartApi.ts';
const item = { product_id: 7, name: 'Vestido', size: 'M', quantity: 2, unit_price: 89900, line_subtotal: 179800, is_active: true };
const payload = { items: [item], subtotal: 179800, currency: 'COP' };

test('lee importes COP del servidor y distingue producto/talla sin recalcular desde catálogo', () => {
  const cart = readApiCart(payload);
  assert.equal(cart.subtotalCents, 17980000);
  assert.equal(cart.items[0].unitPriceCents, 8990000);
  assert.equal(readApiCart({ items: [], subtotal: 0 }).items.length, 0);
  const two = readApiCart({ items: [item, { ...item, size: 'L' }], subtotal: 359600 });
  assert.equal(two.items.length, 2);
  for (const value of [{ ...payload, subtotal: 1 }, { ...payload, currency: 'USD' }, { items: [item, item], subtotal: 359600 }, { items: [{ ...item, line_subtotal: 1 }], subtotal: 1 }, { items: [{ ...item, quantity: 0 }], subtotal: 0 }, { items: [{ ...item, unit_price: 89.9 }], subtotal: 179800 }]) assert.throws(() => readApiCart(value));
});
test('valida cantidades enteras seguras sin inventar máximo de carrito', () => {
  for (const value of ['', '0', '-1', '1.5', '1e2', '9007199254740992']) assert.equal(cartQuantity(value), null);
  assert.equal(cartQuantity(' 21 '), 21);
});
test('envía Bearer y talla explícita en lectura, alta, actualización y eliminación', async () => {
  const calls: { url: string; method: string; body: unknown }[] = [];
  const client = createApiClient('http://backend.test/api/v1', { fetch: async (url, options) => {
    assert.equal(new Headers(options?.headers).get('Authorization'), 'Bearer token-prueba');
    calls.push({ url: String(url), method: String(options?.method ?? 'GET'), body: options?.body ? JSON.parse(String(options.body)) : undefined });
    return Response.json(payload);
  } });
  const signal = new AbortController().signal;
  await requestCart(client, 'token-prueba', signal);
  await requestCart(client, 'token-prueba', signal, { type: 'add', productId: 7, size: 'M', quantity: 2 });
  await requestCart(client, 'token-prueba', signal, { type: 'update', productId: 7, size: 'L', quantity: 3 });
  await requestCart(client, 'token-prueba', signal, { type: 'remove', productId: 7, size: 'XL / 2' });
  assert.deepEqual(calls, [
    { url: 'http://backend.test/api/v1/cart', method: 'GET', body: undefined },
    { url: 'http://backend.test/api/v1/cart', method: 'POST', body: { product_id: 7, quantity: 2, size: 'M' } },
    { url: 'http://backend.test/api/v1/cart/7', method: 'PUT', body: { quantity: 3, size: 'L' } },
    { url: 'http://backend.test/api/v1/cart/7?size=XL%20%2F%202', method: 'DELETE', body: undefined },
  ]);
});
