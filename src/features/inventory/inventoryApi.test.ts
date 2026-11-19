import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError, createApiClient } from '../../shared/api/apiClient.ts';
import { adjustApiInventory, inventoryFieldErrors, listApiInventory, readInventoryRow, validateInventoryDraft } from './inventoryApi.ts';
const row = { product_id: 7, size: 'M', quantity: 12, reserved: 3, available: 9 };
const draft = { productId: '7', size: 'M', quantity: '15', reason: 'Reconteo' };

test('valida físico, reservado y disponible sin transformar stock_by_size', () => {
  assert.deepEqual(readInventoryRow(row), { productId: 7, size: 'M', quantity: 12, reserved: 3, available: 9 });
  for (const value of [{ ...row, available: 12 }, { ...row, quantity: 1 }, { ...row, reserved: -1 }, { ...row, size: '' }, { ...row, quantity: '12' }, { ...row, product_id: 0 }]) assert.throws(() => readInventoryRow(value));
});
test('admite cero y talla nueva, protege reservado consultado y valida motivo', () => {
  const rows = [readInventoryRow(row)];
  assert.deepEqual(validateInventoryDraft(draft, rows, [7]), {});
  assert.ok(validateInventoryDraft({ ...draft, quantity: '2' }, rows, [7]).quantity);
  assert.deepEqual(validateInventoryDraft({ ...draft, size: 'XL', quantity: '0' }, rows, [7]), {});
  for (const quantity of ['-1', '2.5', '1e2', '', '9007199254740992']) assert.ok(validateInventoryDraft({ ...draft, quantity }, rows, [7]).quantity);
  assert.ok(validateInventoryDraft({ ...draft, reason: ' ' }, rows, [7]).reason);
  assert.ok(validateInventoryDraft({ ...draft, reason: 'x'.repeat(256) }, rows, [7]).reason);
  assert.ok(validateInventoryDraft({ ...draft, productId: '8' }, rows, [7]).productId);
});
test('lectura y ajuste por talla envían Bearer y cantidad absoluta, sin endpoint legado', async () => {
  const calls: { url: string; method: string; body: unknown }[] = [];
  const client = createApiClient('http://backend.test/api/v1', { fetch: async (url, options) => {
    assert.equal(new Headers(options?.headers).get('Authorization'), 'Bearer token-prueba');
    calls.push({ url: String(url), method: String(options?.method ?? 'GET'), body: options?.body ? JSON.parse(String(options.body)) : undefined });
    return Response.json(options?.method === 'POST' ? { ...row, quantity: 15, reserved: 4, available: 11 } : [row]);
  } });
  assert.equal((await listApiInventory(client, 'token-prueba', new AbortController().signal)).length, 1);
  const result = await adjustApiInventory(client, 'token-prueba', new AbortController().signal, { ...draft, reason: ' Reconteo ' });
  assert.equal(result.reserved, 4); // Reservas concurrentes: aceptar las confirmadas por el servidor.
  assert.deepEqual(calls, [
    { url: 'http://backend.test/api/v1/inventory', method: 'GET', body: undefined },
    { url: 'http://backend.test/api/v1/inventory/adjustments', method: 'POST', body: { product_id: 7, size: 'M', new_quantity: 15, reason: 'Reconteo' } },
  ]);
});
test('rechaza duplicados y respuestas de otra talla o cantidad', async () => {
  const duplicate = createApiClient('http://backend.test', { fetch: async () => Response.json([row, row]) });
  await assert.rejects(listApiInventory(duplicate, 'token', new AbortController().signal));
  for (const value of [row, { ...row, size: 'L', quantity: 15, available: 12 }]) {
    const client = createApiClient('http://backend.test', { fetch: async () => Response.json(value) });
    await assert.rejects(adjustApiInventory(client, 'token', new AbortController().signal, draft));
  }
});
test('traduce campos 422 documentados sin copiar campos desconocidos', () => {
  const error = new ApiError('Validación', { kind: 'http', status: 422, issues: [{ path: ['body', 'new_quantity'], message: 'Cantidad inválida' }, { path: ['body', 'reason'], message: 'Motivo inválido' }, { path: ['body', 'reserved'], message: 'No editable' }] });
  assert.deepEqual(inventoryFieldErrors(error), { quantity: 'Cantidad inválida', reason: 'Motivo inválido' });
});
