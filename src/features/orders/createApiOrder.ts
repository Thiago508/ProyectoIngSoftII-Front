import { ApiError, type createApiClient } from '../../shared/api/apiClient.ts';
import type { ApiCart } from '../cart/cartApi';
import { readApiOrder, type ApiOrder } from './ordersApi.ts';
export class OrderCreationResponseError extends Error {
  readonly orderId: number | null;
  constructor(orderId: number | null) { super('El servidor respondió, pero no se pudo confirmar el detalle del pedido.'); this.orderId = orderId; }
}
export function orderItems(cart: ApiCart) {
  if (!cart.items.length) throw new Error('El carrito está vacío.');
  if (new Set(cart.items.map((item) => JSON.stringify([item.productId, item.size]))).size !== cart.items.length) throw new Error('Revisa las líneas duplicadas del carrito.');
  return cart.items.map((item) => {
    if (!item.active) throw new Error(`${item.name}: el producto está inactivo. Retíralo del carrito.`);
    if (!Number.isSafeInteger(item.productId) || item.productId <= 0 || !item.size.trim() || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) throw new Error(`${item.name}: cada línea del pedido admite de 1 a 20 unidades y requiere talla.`);
    return { product_id: item.productId, size: item.size, quantity: item.quantity };
  });
}
export async function createApiOrder(client: ReturnType<typeof createApiClient>, token: string, userId: number, cart: ApiCart, signal: AbortSignal): Promise<ApiOrder> {
  const value = await client.request('/orders', { method: 'POST', token, signal, json: { items: orderItems(cart) } });
  const raw = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
  const reference = raw?.user_id === userId && typeof raw.id === 'number' && Number.isSafeInteger(raw.id) && raw.id > 0 ? raw.id : null;
  try {
    const order = readApiOrder(value);
    if (order.userId !== userId) throw new Error('Propietario incompatible.');
    return order;
  } catch { throw new OrderCreationResponseError(reference); }
}
export function isOrderRejection(cause: unknown): boolean {
  return cause instanceof ApiError && cause.kind === 'http' && cause.status !== undefined && cause.status >= 400 && cause.status < 500 && cause.status !== 408;
}
