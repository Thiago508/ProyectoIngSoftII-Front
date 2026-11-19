import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError, createApiClient } from '../../shared/api/apiClient.ts';
import { apiProductErrors, deactivateApiProduct, emptyApiProduct, listApiProducts, productPayload, readAdminProduct, saveApiProduct, validateApiProduct } from './productsApi.ts';
const base = 'http://backend.test/api/v1';
const product = { id: 7, slug: 'vestido', sku: null, name: 'Vestido', description: '', price: 89900, category: 'Vestidos', sizes: ['M'], image: '', featured: false, stock_by_size: { M: 0 }, is_active: true };
const draft = { ...emptyApiProduct, slug: ' vestido ', name: ' Vestido ', price: '89900', category: 'Vestidos', sizes: 'S, M' };

test('valida metadata y pesos enteros sin inventar ajustes de stock', () => {
  assert.deepEqual(validateApiProduct(draft), {});
  const create = productPayload(draft, true);
  assert.equal(create.quantity, 0);
  assert.equal(create.is_active, true);
  assert.equal('active' in create, false);
  assert.equal(create.sku, null);
  assert.deepEqual(create.sizes, ['S', 'M']);
  const update = productPayload(draft, false);
  assert.equal('quantity' in update, false);
  assert.equal('is_active' in update, false);
  for (const price of ['89900.50', '89,900', '0', '9007199254740991']) assert.ok(validateApiProduct({ ...draft, price }).price);
  for (const image of ['javascript:alert(1)', 'data:image/png;base64,x', 'http://user:pass@example.com/a']) assert.ok(validateApiProduct({ ...draft, image }).image);
  assert.ok(validateApiProduct({ ...draft, sizes: 'M, M' }).sizes);
  assert.ok(validateApiProduct({ ...draft, slug: 'x', category: 'x', name: 'x' }).name);
});
test('mantiene metadata de edición y estado inactivo canónico', () => {
  const item = readAdminProduct({ ...product, is_active: false, active: true }, base);
  assert.equal(item.active, false);
  assert.equal(item.price, 89900);
  assert.equal(item.sku, null);
  assert.throws(() => readAdminProduct({ ...product, featured: 'true' }, base));
});
test('lectura pública y escrituras Bearer usan solo endpoints documentados', async () => {
  const calls: { url: string; method: string; body: unknown }[] = [];
  const client = createApiClient(base, { fetch: async (url, options) => {
    const method = options?.method ?? 'GET';
    assert.equal(new Headers(options?.headers).get('Authorization'), method === 'GET' ? null : 'Bearer token-prueba');
    calls.push({ url: String(url), method, body: options?.body ? JSON.parse(String(options.body)) : undefined });
    return Response.json(method === 'GET' ? [product] : { ...product, is_active: method !== 'PATCH' });
  } });
  const signal = new AbortController().signal;
  assert.equal((await listApiProducts(client, base, signal)).length, 1);
  await saveApiProduct(client, base, 'token-prueba', signal, draft);
  await saveApiProduct(client, base, 'token-prueba', signal, draft, 7);
  await deactivateApiProduct(client, base, 'token-prueba', signal, 7);
  assert.deepEqual(calls.map(({ url, method }) => ({ url, method })), [
    { url: `${base}/products`, method: 'GET' }, { url: `${base}/products`, method: 'POST' },
    { url: `${base}/products/7`, method: 'PUT' }, { url: `${base}/products/7/deactivate`, method: 'PATCH' },
  ]);
  assert.equal(calls[3].body, undefined);
});
test('mapea 422 permitidos y rechaza ID o desactivación incompatibles', async () => {
  assert.deepEqual(apiProductErrors(new ApiError('Validación', { kind: 'http', status: 422, issues: [{ path: ['body', 'sizes', 0], message: 'Talla inválida' }, { path: ['body', 'quantity'], message: 'No editar' }] })), { sizes: 'Talla inválida' });
  const client = createApiClient(base, { fetch: async () => Response.json(product) });
  await assert.rejects(saveApiProduct(client, base, 'token', new AbortController().signal, draft, 8));
  await assert.rejects(deactivateApiProduct(client, base, 'token', new AbortController().signal, 7));
});
