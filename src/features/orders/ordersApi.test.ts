import assert from 'node:assert/strict';
import test from 'node:test';
import { createApiClient } from '../../shared/api/apiClient.ts';
import { getApiOrder, readApiOrder, validOrderId } from './ordersApi.ts';
const order = { id: 7, user_id: 21, status: 'pendiente', reservation_state: 'activa', total: 89900, created_at: '2026-11-19T10:05:00', reservation_expires_at: '2026-11-19T10:20:00', items: [{ id: 1, product_id: 4, name: 'Vestido histórico', size: 'M', quantity: 1, unit_price: 89900 }], payment: { id: 2, order_id: 7, amount: 89900, status: 'pendiente', method: 'card' } };
test('lee importes e instantáneas históricas sin convertir fechas ni inferir pago', () => {
  const result = readApiOrder(order);
  assert.equal(result.total, 89900);
  assert.equal(result.createdAt, order.created_at);
  assert.equal(result.reservationExpiresAt, order.reservation_expires_at);
  assert.equal(result.payment?.status, 'pendiente');
  assert.equal(result.shipping.address, null);
  for (const value of [{ ...order, total: 899.5 }, { ...order, currency: 'USD' }, { ...order, items: [order.items[0], order.items[0]] }, { ...order, payment: { ...order.payment, order_id: 8 } }]) assert.throws(() => readApiOrder(value));
});
test('consulta solo GET documentado, verifica propietario y reconoce 404', async () => {
  let calls = 0;
  const client = createApiClient('http://backend.test/api/v1', { fetch: async (url, options) => {
    calls++;
    assert.equal(String(url), 'http://backend.test/api/v1/orders/7');
    assert.equal(new Headers(options?.headers).get('Authorization'), 'Bearer token');
    assert.equal(options?.body, undefined);
    return Response.json(order);
  } });
  const signal = new AbortController().signal;
  assert.equal((await getApiOrder(client, 'token', 21, '7', signal))?.id, 7);
  assert.equal(await getApiOrder(client, 'token', 22, '7', signal), null);
  assert.equal(await getApiOrder(client, 'token', 21, 'demo-id', signal), null);
  assert.equal(calls, 2);
  const missing = createApiClient('http://backend.test', { fetch: async () => Response.json({ detail: 'No existe' }, { status: 404 }) });
  assert.equal(await getApiOrder(missing, 'token', 21, '7', signal), null);
  for (const id of ['0', '-1', '7.5', '1e3', '9007199254740992']) assert.equal(validOrderId(id), false);
});
