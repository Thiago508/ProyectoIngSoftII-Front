import assert from 'node:assert/strict';
import test from 'node:test';
import { createApiClient } from '../../shared/api/apiClient.ts';
import { catalogPhotoUrl, loadApiCatalog, readCatalogProduct } from './catalogApi.ts';
const base = 'http://backend.test/api/v1';
const product = { id: 1, slug: 'vestido', name: 'Vestido', description: 'Floral', price: 89900, currency: 'COP', sizes: ['M'], image: '/media/vestido.jpg', is_active: true, stock_by_size: { M: 5, L: 0 } };

test('adapta COP sin redondear, fotos remotas y stock disponible por talla', () => {
  const item = readCatalogProduct(product, base, true);
  assert.equal(item.priceCents, 8990000);
  assert.equal(item.image?.src, 'http://backend.test/media/vestido.jpg');
  assert.equal(item.image?.source, 'remote');
  assert.deepEqual(item.availability, [{ sku: 'M', size: 'M', available: 5 }, { sku: 'L', size: 'L', available: 0 }]);
  assert.equal(readCatalogProduct(product, base).availability, undefined);
  for (const price of [89.9, -1, '89900', Number.MAX_SAFE_INTEGER]) assert.throws(() => readCatalogProduct({ ...product, price }, base));
  assert.throws(() => readCatalogProduct({ ...product, currency: 'USD' }, base));
  assert.throws(() => readCatalogProduct({ ...product, stock_by_size: { M: -1 } }, base, true));
  assert.throws(() => readCatalogProduct({ ...product, stock_by_size: undefined }, base, true));
});
test('no admite protocolos peligrosos ni credenciales en imágenes', () => {
  for (const image of ['javascript:alert(1)', 'data:text/html,x', 'https://user:pass@example.com/a', '']) assert.equal(catalogPhotoUrl(image, base), undefined);
  assert.equal(catalogPhotoUrl('https://cdn.test/a.jpg', base), 'https://cdn.test/a.jpg');
});
test('consulta listado y detalle públicos, excluye inactivos y reconoce 404', async () => {
  const calls: string[] = [];
  const client = createApiClient(base, { fetch: async (url, options) => {
    calls.push(String(url));
    assert.equal(new Headers(options?.headers).has('Authorization'), false);
    if (String(url).endsWith('/products/2')) return Response.json({ detail: 'No existe' }, { status: 404 });
    return Response.json(String(url).endsWith('/catalog') ? { items: [product, { ...product, id: 2, is_active: false }], count: 2 } : product);
  } });
  const signal = new AbortController().signal;
  assert.equal((await loadApiCatalog(client, base, undefined, signal)).length, 1);
  assert.equal((await loadApiCatalog(client, base, '1', signal))[0].availability?.[0].available, 5);
  assert.deepEqual(await loadApiCatalog(client, base, '2', signal), []);
  assert.deepEqual(await loadApiCatalog(client, base, 'demo-dress', signal), []);
  assert.deepEqual(calls, [`${base}/catalog`, `${base}/products/1`, `${base}/products/2`]);
});
test('rechaza respuestas ambiguas o incompatibles sin sustituirlas por demo', async () => {
  for (const value of [{ items: [product, product], count: 2 }, { items: [], count: '0' }, []]) {
    const client = createApiClient(base, { fetch: async () => Response.json(value) });
    await assert.rejects(loadApiCatalog(client, base, undefined, new AbortController().signal));
  }
});
