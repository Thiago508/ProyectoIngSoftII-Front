import { ApiError, type createApiClient } from '../../shared/api/apiClient.ts';
export interface ApiNotification { id: number; userId: number; orderId: number | null; event: string; resultingStatus: string; message: string; processingStatus: string; attemptCount: number; isRead: boolean; createdAt: string | null }
export interface ApiNotificationAttempt { id: number; notificationId: number | null; userId: number | null; orderId: number | null; event: string; result: string; error: string | null; attemptedAt: string | null }
function invalid(): never { throw new ApiError('La API devolvió notificaciones incompatibles con el contrato.', { kind: 'response' }); }
function record(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function id(value: unknown): value is number { return typeof value === 'number' && Number.isSafeInteger(value) && value > 0; }
function nullableId(value: unknown): value is number | null { return value === null || id(value); }
function date(value: unknown): string | null { if (value === undefined || value === null) return null; if (typeof value !== 'string') return invalid(); return value; }
function unique<T extends { id: number }>(items: T[]): T[] { if (new Set(items.map((item) => item.id)).size !== items.length) return invalid(); return items; }
export function readNotification(value: unknown): ApiNotification {
  if (!record(value) || !id(value.id) || !id(value.user_id) || !nullableId(value.order_id) || typeof value.event !== 'string' || typeof value.resulting_status !== 'string' || typeof value.message !== 'string' || typeof value.processing_status !== 'string' || typeof value.attempt_count !== 'number' || !Number.isSafeInteger(value.attempt_count) || value.attempt_count < 0 || typeof value.is_read !== 'boolean') return invalid();
  return { id: value.id, userId: value.user_id, orderId: value.order_id, event: value.event, resultingStatus: value.resulting_status, message: value.message, processingStatus: value.processing_status, attemptCount: value.attempt_count, isRead: value.is_read, createdAt: date(value.created_at) };
}
export function readNotificationAttempt(value: unknown): ApiNotificationAttempt {
  if (!record(value) || !id(value.id) || !nullableId(value.notification_id) || !nullableId(value.user_id) || !nullableId(value.order_id) || typeof value.event !== 'string' || typeof value.result !== 'string' || (value.error !== undefined && value.error !== null && typeof value.error !== 'string')) return invalid();
  return { id: value.id, notificationId: value.notification_id, userId: value.user_id, orderId: value.order_id, event: value.event, result: value.result, error: typeof value.error === 'string' ? value.error : null, attemptedAt: date(value.attempted_at) };
}
export async function listApiNotifications(client: ReturnType<typeof createApiClient>, token: string, userId: number, signal: AbortSignal): Promise<ApiNotification[]> {
  const value = await client.request('/notifications', { token, signal });
  if (!Array.isArray(value)) return invalid();
  const notices = unique(value.map(readNotification));
  if (notices.some((notice) => notice.userId !== userId)) return invalid();
  return notices;
}
export async function listApiAttempts(client: ReturnType<typeof createApiClient>, token: string, signal: AbortSignal): Promise<ApiNotificationAttempt[]> {
  const value = await client.request('/notifications/attempts', { token, signal });
  if (!Array.isArray(value)) return invalid();
  return unique(value.map(readNotificationAttempt));
}
export async function markApiNotificationRead(client: ReturnType<typeof createApiClient>, token: string, signal: AbortSignal, notificationId: number): Promise<void> {
  if (!id(notificationId)) throw new Error('Notificación inválida.');
  // La respuesta es un objeto abierto: no inferir is_read ni nombres de campos inexistentes.
  const value = await client.request(`/notifications/${notificationId}/read`, { method: 'POST', token, signal });
  if (!record(value)) return invalid();
}
