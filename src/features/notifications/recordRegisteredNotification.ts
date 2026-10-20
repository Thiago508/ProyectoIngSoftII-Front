import type { DemoNotification } from './notificationsDemo.ts';

// Deduplicación local por pedido y evento; no sustituye la idempotencia del servidor.
export function recordRegisteredNotification(notices: readonly DemoNotification[], orderId: string,
  occurredAt: string): readonly DemoNotification[] {
  const id = `registered:${orderId}`;
  if (notices.some((notice) => notice.id === id)) return notices;
  return [{ id, orderId, status: 'registered', occurredAt }, ...notices];
}
