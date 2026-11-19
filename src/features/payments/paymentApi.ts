import { ApiError, type createApiClient } from '../../shared/api/apiClient.ts';
import { getApiOrder, readApiOrder, type ApiOrder } from '../orders/ordersApi.ts';
export type TestCardToken = 'tok_ok' | 'tok_declined';
export function canPayOrder(order: ApiOrder): boolean {
  return (!order.payment || order.payment.amount === order.total) && order.status === 'pendiente_pago' && order.reservationState === 'activa' && (!order.payment || ['pendiente', 'fallido', 'rechazado'].includes(order.payment.status));
}
export function paymentOutcome(order: ApiOrder): 'approved' | 'rejected' | 'unconfirmed' {
  if (order.payment && order.payment.amount !== order.total) return 'unconfirmed';
  if (order.status === 'pagado' && order.payment && ['aprobado', 'pagado'].includes(order.payment.status)) return 'approved';
  if (order.status !== 'pagado' && order.payment && ['rechazado', 'fallido'].includes(order.payment.status)) return 'rejected';
  return 'unconfirmed';
}
export async function payApiOrder(client: ReturnType<typeof createApiClient>, token: string, userId: number, order: ApiOrder, cardToken: TestCardToken, signal: AbortSignal): Promise<ApiOrder> {
  if (!canPayOrder(order) || order.userId !== userId || !['tok_ok', 'tok_declined'].includes(cardToken)) throw new Error('Consulta un pedido propio pendiente con reserva activa y selecciona un token de prueba.');
  const response = readApiOrder(await client.request(`/orders/${order.id}/checkout`, { method: 'POST', token, signal, json: { method: 'card', card_token: cardToken } }));
  if (response.id !== order.id || response.userId !== userId) throw new ApiError('La respuesta de pago no corresponde al pedido solicitado.', { kind: 'response' });
  // El pedido se vuelve a consultar: un POST correcto no equivale por sí solo a pago aprobado.
  const confirmed = await getApiOrder(client, token, userId, String(order.id), signal);
  if (!confirmed) throw new ApiError('No se pudo confirmar el estado del pedido después del pago.', { kind: 'response' });
  return confirmed;
}
