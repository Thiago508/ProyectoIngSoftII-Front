import assert from 'node:assert/strict';
import test from 'node:test';
import { createApiClient } from '../../shared/api/apiClient.ts';
import { listApiAttempts, listApiNotifications, markApiNotificationRead, readNotification, readNotificationAttempt } from './notificationsApi.ts';
const notice = { id: 1, user_id: 21, order_id: 7, event: 'order_created', resulting_status: 'pendiente', message: 'Pedido registrado', processing_status: 'pending', attempt_count: 0, is_read: false, created_at: '2026-11-19T09:10:00' };
const attempt = { id: 4, notification_id: null, user_id: null, order_id: null, event: 'order_created', result: 'failed', error: 'Error SMTP', attempted_at: null };

test('conserva estado, fechas sin zona y asociaciones anulables sin inferir entrega', () => {
  assert.equal(readNotification(notice).createdAt, notice.created_at);
  assert.equal(readNotification(notice).isRead, false);
  assert.equal(readNotificationAttempt(attempt).notificationId, null);
  assert.equal(readNotificationAttempt({ ...attempt, result: 'otro_resultado' }).result, 'otro_resultado');
  for (const value of [{ ...notice, is_read: 'false' }, { ...notice, attempt_count: -1 }, { ...notice, order_id: 0 }, { ...notice, user_id: '21' }, { ...notice, created_at: 123 }]) assert.throws(() => readNotification(value));
  assert.throws(() => readNotificationAttempt({ ...attempt, result: 7 }));
});
test('lectura Bearer valida pertenencia y duplicados antes de mostrar datos privados', async () => {
  const client = createApiClient('http://backend.test/api/v1', { fetch: async (url, options) => {
    assert.equal(String(url), 'http://backend.test/api/v1/notifications');
    assert.equal(new Headers(options?.headers).get('Authorization'), 'Bearer token');
    return Response.json([notice]);
  } });
  assert.equal((await listApiNotifications(client, 'token', 21, new AbortController().signal)).length, 1);
  await assert.rejects(listApiNotifications(client, 'token', 22, new AbortController().signal));
  const duplicate = createApiClient('http://backend.test', { fetch: async () => Response.json([notice, notice]) });
  await assert.rejects(listApiNotifications(duplicate, 'token', 21, new AbortController().signal));
});
test('intentos usan su consulta y marcar leído admite objeto abierto sin inventar campos', async () => {
  const calls: { url: string; method: string; body: unknown }[] = [];
  const client = createApiClient('http://backend.test/api/v1', { fetch: async (url, options) => {
    assert.equal(new Headers(options?.headers).get('Authorization'), 'Bearer token');
    calls.push({ url: String(url), method: String(options?.method ?? 'GET'), body: options?.body });
    return Response.json(String(url).endsWith('/attempts') ? [attempt] : {});
  } });
  assert.equal((await listApiAttempts(client, 'token', new AbortController().signal))[0].error, 'Error SMTP');
  await markApiNotificationRead(client, 'token', new AbortController().signal, 1);
  assert.deepEqual(calls, [
    { url: 'http://backend.test/api/v1/notifications/attempts', method: 'GET', body: undefined },
    { url: 'http://backend.test/api/v1/notifications/1/read', method: 'POST', body: undefined },
  ]);
  const wrong = createApiClient('http://backend.test', { fetch: async () => Response.json([]) });
  await assert.rejects(markApiNotificationRead(wrong, 'token', new AbortController().signal, 1));
});
