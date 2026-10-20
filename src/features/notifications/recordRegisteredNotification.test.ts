import assert from 'node:assert/strict';
import test from 'node:test';
import { recordRegisteredNotification } from './recordRegisteredNotification.ts';

test('conserva referencia, estado y fecha del pedido creado sin modificar la lista original', () => {
  const first = recordRegisteredNotification([], 'DEMO-1', '2026-10-20T15:00:00Z');
  assert.deepEqual(first, [{ id: 'registered:DEMO-1', orderId: 'DEMO-1', status: 'registered', occurredAt: '2026-10-20T15:00:00Z' }]);
  const second = recordRegisteredNotification(first, 'DEMO-2', '2026-10-20T16:00:00Z');
  assert.equal(first.length, 1);
  assert.equal(second.length, 2);
  assert.equal(second[0].orderId, 'DEMO-2');
  assert.deepEqual(second[1], first[0]);
});

test('repetir el evento de registro no duplica el aviso ni sustituye su fecha original', () => {
  const notices = recordRegisteredNotification([], 'DEMO-1', '2026-10-20T15:00:00Z');
  const repeated = recordRegisteredNotification(notices, 'DEMO-1', '2026-10-20T18:00:00Z');
  assert.equal(repeated, notices);
  assert.equal(repeated.length, 1);
  assert.equal(repeated[0].occurredAt, '2026-10-20T15:00:00Z');
});
