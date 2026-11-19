import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError, createApiClient } from '../../shared/api/apiClient.ts';
import { createApiOrder, isOrderRejection, orderItems, OrderCreationResponseError } from './createApiOrder.ts';
const shipping = { address: 'Calle 10 # 20 - 30', phone: '+57 (300) 123-4567', city: 'Armenia', department: 'Quindío' };
const cart = { items: [{ productId: 7, size: 'M', quantity: 2, name: 'Vestido', unitPriceCents: 8990000, subtotalCents: 17980000, active: true }], subtotalCents: 17980000 };
const order = { shipping_address: shipping.address, shipping_phone: shipping.phone, shipping_city: shipping.city, shipping_department: shipping.department, id: 9, user_id: 21, status: 'pendiente', reservation_state: 'activa', total: 179800, items: [] };
test('valida líneas activas de 1 a 20 y envía items y datos de envío con Bearer', async () => {
  let calls = 0;
  const client = createApiClient('http://backend.test/api/v1', { fetch: async (url, options) => {
    calls++; assert.equal(String(url), 'http://backend.test/api/v1/orders'); assert.equal(options?.method, 'POST');
    assert.equal(new Headers(options?.headers).get('Authorization'), 'Bearer token');
    assert.deepEqual(JSON.parse(String(options?.body)), { items: [{ product_id: 7, size: 'M', quantity: 2 }], shipping_address: shipping.address, shipping_phone: shipping.phone, shipping_city: shipping.city, shipping_department: shipping.department });
    return Response.json(order, { status: 201 });
  } });
  assert.equal((await createApiOrder(client, 'token', 21, cart, shipping, new AbortController().signal)).id, 9);
  assert.equal(calls, 1);
  for (const quantity of [0, 21, 1.5]) assert.throws(() => orderItems({ ...cart, items: [{ ...cart.items[0], quantity }] }));
  assert.throws(() => orderItems({ ...cart, items: [] }));
  assert.throws(() => orderItems({ ...cart, items: [{ ...cart.items[0], active: false }] }));
});
test('conserva una referencia propia recuperable cuando el resto de respuesta falla', async () => {
  const client = createApiClient('http://backend.test', { fetch: async () => Response.json({ ...order, total: 'incorrecto' }) });
  await assert.rejects(createApiOrder(client, 'token', 21, cart, shipping, new AbortController().signal), (cause) => cause instanceof OrderCreationResponseError && cause.orderId === 9);
  const foreign = createApiClient('http://backend.test', { fetch: async () => Response.json({ ...order, user_id: 22 }) });
  await assert.rejects(createApiOrder(foreign, 'token', 21, cart, shipping, new AbortController().signal), (cause) => cause instanceof OrderCreationResponseError && cause.orderId === null);
});
test('distingue rechazo de negocio de resultados inciertos sin reintento automático', async () => {
  for (const status of [400, 401, 403, 409, 422]) assert.equal(isOrderRejection(new ApiError('Rechazado', { kind: 'http', status })), true);
  for (const cause of [new ApiError('Timeout', { kind: 'timeout' }), new ApiError('Servidor', { kind: 'http', status: 500 }), new ApiError('Timeout servidor', { kind: 'http', status: 408 }), new ApiError('Datos', { kind: 'response' })]) assert.equal(isOrderRejection(cause), false);
});
