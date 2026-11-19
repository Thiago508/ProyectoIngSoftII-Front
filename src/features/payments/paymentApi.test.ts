import assert from 'node:assert/strict';
import test from 'node:test';
import { createApiClient } from '../../shared/api/apiClient.ts';
import { readApiOrder } from '../orders/ordersApi.ts';
import { canPayOrder, payApiOrder, paymentOutcome } from './paymentApi.ts';
const raw = { id: 7, user_id: 21, status: 'pendiente_pago', reservation_state: 'activa', total: 89900 };
const order = readApiOrder(raw);
test('solo habilita pedido pendiente con reserva activa sin inferir expiración por fecha', () => {
  assert.equal(canPayOrder(order), true);
  assert.equal(canPayOrder({ ...order, reservationExpiresAt: '2000-01-01T00:00:00' }), true); // Decide backend, no el reloj sin zona.
  for (const status of ['pagado', 'cancelado', 'expirado', 'estado_nuevo']) assert.equal(canPayOrder({ ...order, status }), false);
  assert.equal(canPayOrder({ ...order, reservationState: 'liberada' }), false);
  assert.equal(canPayOrder({ ...order, payment: { id: 1, status: 'aprobado', method: 'card', amount: 89900 } }), false);
});
test('no declara aprobación por seleccionar token ni por estados contradictorios', () => {
  assert.equal(paymentOutcome(order), 'unconfirmed');
  const payment = { id: 1, status: 'aprobado', method: 'card', amount: 89900 };
  assert.equal(paymentOutcome({ ...order, payment }), 'unconfirmed');
  assert.equal(paymentOutcome({ ...order, status: 'pagado', payment }), 'approved');
  assert.equal(paymentOutcome({ ...order, status: 'cancelado', payment: { ...payment, status: 'rechazado' } }), 'rejected');
});
test('POST solo envía método/token y confirma el resultado mediante GET del mismo pedido', async () => {
  const calls: string[] = [];
  const client = createApiClient('http://backend.test/api/v1', { fetch: async (url, options) => {
    calls.push(`${options?.method ?? 'GET'} ${url}`);
    assert.equal(new Headers(options?.headers).get('Authorization'), 'Bearer token');
    if (options?.method === 'POST') { assert.deepEqual(JSON.parse(String(options.body)), { method: 'card', card_token: 'tok_ok' }); return Response.json(raw); }
    return Response.json({ ...raw, status: 'pagado', reservation_state: 'consumida', payment: { id: 1, order_id: 7, amount: 89900, method: 'card', status: 'aprobado' } });
  } });
  const result = await payApiOrder(client, 'token', 21, order, 'tok_ok', new AbortController().signal);
  assert.equal(paymentOutcome(result), 'approved');
  assert.deepEqual(calls, ['POST http://backend.test/api/v1/orders/7/checkout', 'GET http://backend.test/api/v1/orders/7']);
});
test('rechaza respuestas de otro pedido y no llama la pasarela para un pedido pagado', async () => {
  let calls = 0;
  const client = createApiClient('http://backend.test', { fetch: async () => { calls++; return Response.json({ ...raw, id: 8 }); } });
  await assert.rejects(payApiOrder(client, 'token', 21, order, 'tok_ok', new AbortController().signal));
  await assert.rejects(payApiOrder(client, 'token', 21, { ...order, status: 'pagado' }, 'tok_ok', new AbortController().signal));
  assert.equal(calls, 1);
});


test('un importe de pago distinto del total no confirma aprobación ni habilita otro intento', () => {
  const payment = { id: 1, status: 'aprobado', method: 'card', amount: 1 };
  assert.equal(paymentOutcome({ ...order, status: 'pagado', payment }), 'unconfirmed');
  assert.equal(canPayOrder({ ...order, payment: { ...payment, status: 'pendiente' } }), false);
});
