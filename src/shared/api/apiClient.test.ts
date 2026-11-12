import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError, createApiClient, normalizeApiBaseUrl, parseApiError } from './apiClient.ts';

const base = 'http://127.0.0.1:8000/api/v1';
const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

test('normaliza la configuración y mantiene el prefijo API sin duplicarlo', async () => {
  assert.equal(normalizeApiBaseUrl(` ${base}/// `), base);
  for (const value of ['', undefined, '/api/v1', 'ftp://localhost/api/v1', 'http://user:pass@localhost/api/v1', `${base}?token=test`, `${base}#fragment`]) assert.throws(() => normalizeApiBaseUrl(value));
  const client = createApiClient(`${base}/`, { fetch: async (url, options) => {
    assert.equal(url, `${base}/health`);
    const headers = new Headers(options?.headers);
    assert.equal(headers.get('Accept'), 'application/json');
    assert.equal(headers.get('Authorization'), null);
    assert.equal(headers.get('Content-Type'), null);
    assert.equal(options?.credentials, 'omit');
    return jsonResponse({ status: 'ok' });
  } });
  assert.deepEqual(await client.request('/health'), { status: 'ok' });
  await assert.rejects(client.request('https://otro.example/health'), /ruta de API relativa/);
});

test('envía JSON o formulario OAuth2 y solo incluye Bearer si se proporciona', async () => {
  let calls = 0;
  const client = createApiClient(base, { fetch: async (url, options) => {
    calls++;
    const headers = new Headers(options?.headers);
    assert.equal(options?.method, 'POST');
    if (calls === 1) {
      assert.equal(url, `${base}/auth/login`);
      assert.equal(headers.get('Content-Type'), 'application/x-www-form-urlencoded');
      assert.equal(headers.get('Authorization'), null);
      assert.equal(new URLSearchParams(String(options?.body)).get('username'), 'cliente@example.com');
      assert.equal(new URLSearchParams(String(options?.body)).get('password'), ' clave exacta ');
    } else {
      assert.equal(headers.get('Content-Type'), 'application/json');
      assert.equal(headers.get('Authorization'), 'Bearer token-de-prueba');
      assert.deepEqual(JSON.parse(String(options?.body)), { items: [{ product_id: 1, size: 'M', quantity: 2 }] });
    }
    return jsonResponse({ ok: true });
  } });
  await client.request('/auth/login', { method: 'POST', form: new URLSearchParams({ username: 'cliente@example.com', password: ' clave exacta ' }) });
  await client.request('/orders', { method: 'POST', token: 'token-de-prueba', json: { items: [{ product_id: 1, size: 'M', quantity: 2 }] } });
  assert.equal(calls, 2);
});

test('normaliza detail como texto, negocio o validación sin retener input o ctx', () => {
  assert.equal(parseApiError(401, { detail: 'Credenciales incorrectas' }).status, 401);
  const business = parseApiError(409, { detail: { code: 'INSUFFICIENT_STOCK', message: 'Sin existencias', product_id: 7, product_name: 'Vestido' } });
  assert.equal(business.code, 'INSUFFICIENT_STOCK');
  assert.equal(business.message, 'Sin existencias');
  assert.equal(business.productId, 7);
  assert.equal(business.productName, 'Vestido');
  const validation = parseApiError(422, { detail: [{ loc: ['body', 'items', 0, 'quantity'], msg: 'Cantidad inválida', input: 'dato-privado', ctx: { value: 'otro-dato-privado' } }] });
  assert.deepEqual(validation.issues, [{ path: ['body', 'items', 0, 'quantity'], message: 'Cantidad inválida' }]);
  assert.equal(JSON.stringify(validation).includes('dato-privado'), false);
  assert.equal(parseApiError(403, null).status, 403);
});

test('distingue HTTP de respuesta inválida, admite 204 y no reintenta operaciones automáticamente', async () => {
  let calls = 0;
  const failed = createApiClient(base, { fetch: async () => { calls++; return new Response('<html>Error</html>', { status: 503 }); } });
  await assert.rejects(failed.request('/orders', { method: 'POST', json: { items: [] } }), (cause: unknown) => cause instanceof ApiError && cause.kind === 'http' && cause.status === 503);
  assert.equal(calls, 1);
  const invalid = createApiClient(base, { fetch: async () => new Response('<html>No es JSON</html>') });
  await assert.rejects(invalid.request('/health'), (cause: unknown) => cause instanceof ApiError && cause.kind === 'response');
  const empty = createApiClient(base, { fetch: async () => new Response(null, { status: 204 }) });
  assert.equal(await empty.request('/health'), null);
});

test('distingue fallo de red, tiempo de espera y cancelación solicitada', async () => {
  const offline = createApiClient(base, { fetch: async () => { throw new TypeError('Failed to fetch'); } });
  await assert.rejects(offline.request('/health'), (cause: unknown) => cause instanceof ApiError && cause.kind === 'network');
  const waitForAbort: typeof fetch = async (_url, options) => new Promise((_resolve, reject) => {
    options?.signal?.addEventListener('abort', () => reject(new DOMException('Cancelada', 'AbortError')), { once: true });
  });
  const slow = createApiClient(base, { fetch: waitForAbort, timeoutMs: 20 });
  await assert.rejects(slow.request('/health'), (cause: unknown) => cause instanceof ApiError && cause.kind === 'timeout');
  const controller = new AbortController();
  const pending = createApiClient(base, { fetch: waitForAbort }).request('/health', { signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  let called = false;
  const aborted = createApiClient(base, { fetch: async () => { called = true; return jsonResponse({}); } });
  await assert.rejects(aborted.request('/health', { signal: controller.signal }), { name: 'AbortError' });
  assert.equal(called, false);
});
