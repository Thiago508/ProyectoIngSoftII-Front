import { ApiError, type createApiClient } from '../../shared/api/apiClient.ts';
export interface ApiOrderItem { id: number; productId: number; name: string; size: string; quantity: number; unitPrice: number }
export interface ApiOrderPayment { id: number; status: string; method: string; amount: number }
export interface ApiOrder { id: number; userId: number; status: string; reservationState: string; total: number; createdAt: string | null; reservationExpiresAt: string | null; shipping: { address: string | null; phone: string | null; city: string | null; department: string | null }; items: ApiOrderItem[]; payment: ApiOrderPayment | null }
const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const id = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
function invalid(): never { throw new ApiError('La API devolvió un pedido incompatible con el contrato.', { kind: 'response' }); }
function text(value: unknown): string | null { if (value === undefined || value === null) return null; if (typeof value !== 'string') return invalid(); return value; }
function money(value: unknown): number { if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || !Number.isSafeInteger(value * 100)) return invalid(); return value; }
export function validOrderId(value: string): boolean { return /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value)); }
export function readApiOrder(value: unknown): ApiOrder {
  if (!object(value) || !id(value.id) || !id(value.user_id) || typeof value.status !== 'string' || typeof value.reservation_state !== 'string' || (value.currency !== undefined && value.currency !== 'COP') || (value.items !== undefined && !Array.isArray(value.items))) return invalid();
  const items = ((value.items ?? []) as unknown[]).map((item): ApiOrderItem => {
    if (!object(item) || !id(item.id) || !id(item.product_id) || !id(item.quantity) || typeof item.name !== 'string' || typeof item.size !== 'string') return invalid();
    return { id: item.id, productId: item.product_id, name: item.name, size: item.size, quantity: item.quantity, unitPrice: money(item.unit_price) };
  });
  if (new Set(items.map((item) => item.id)).size !== items.length) return invalid();
  let payment: ApiOrderPayment | null = null;
  if (value.payment !== undefined && value.payment !== null) {
    const raw = value.payment;
    if (!object(raw) || !id(raw.id) || raw.order_id !== value.id || typeof raw.status !== 'string' || typeof raw.method !== 'string' || (raw.currency !== undefined && raw.currency !== 'COP')) return invalid();
    payment = { id: raw.id, status: raw.status, method: raw.method, amount: money(raw.amount) };
  }
  return { id: value.id, userId: value.user_id, status: value.status, reservationState: value.reservation_state, total: money(value.total), createdAt: text(value.created_at), reservationExpiresAt: text(value.reservation_expires_at), shipping: { address: text(value.shipping_address), phone: text(value.shipping_phone), city: text(value.shipping_city), department: text(value.shipping_department) }, items, payment };
}
export async function getApiOrder(client: ReturnType<typeof createApiClient>, token: string, userId: number, orderId: string, signal: AbortSignal): Promise<ApiOrder | null> {
  if (!validOrderId(orderId)) return null;
  try {
    const order = readApiOrder(await client.request(`/orders/${orderId}`, { token, signal }));
    if (order.id !== Number(orderId)) return invalid();
    // No presentar datos de un propietario distinto aunque una respuesta incorrecta los incluya.
    return order.userId === userId ? order : null;
  } catch (cause) { if (cause instanceof ApiError && cause.status === 404) return null; throw cause; }
}
