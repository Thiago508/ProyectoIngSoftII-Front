import { ApiError, type createApiClient } from '../../shared/api/apiClient.ts';
export interface ApiCartLine { productId: number; name: string; size: string; quantity: number; unitPriceCents: number; subtotalCents: number; active: boolean }
export interface ApiCart { items: ApiCartLine[]; subtotalCents: number }
export type CartChange = { type: 'add' | 'update' | 'remove'; productId: number; size: string; quantity?: number };
function invalid(): never { throw new ApiError('La API devolvió un carrito incompatible con el contrato.', { kind: 'response' }); }
function record(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function natural(value: unknown): value is number { return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0; }
function cents(value: unknown): number { if (!natural(value) || !Number.isSafeInteger(value * 100)) return invalid(); return value * 100; }
export function readApiCart(value: unknown): ApiCart {
  if (!record(value) || !Array.isArray(value.items) || (value.currency !== undefined && value.currency !== 'COP')) return invalid();
  const items = value.items.map((item): ApiCartLine => {
    if (!record(item) || !natural(item.product_id) || item.product_id === 0 || typeof item.name !== 'string' || !item.name.trim() || typeof item.size !== 'string' || !item.size.trim() || !natural(item.quantity) || item.quantity === 0 || typeof item.is_active !== 'boolean' || (item.currency !== undefined && item.currency !== 'COP')) return invalid();
    const unitPriceCents = cents(item.unit_price);
    const subtotalCents = cents(item.line_subtotal);
    if (!Number.isSafeInteger(unitPriceCents * item.quantity) || unitPriceCents * item.quantity !== subtotalCents) return invalid();
    return { productId: item.product_id, name: item.name, size: item.size, quantity: item.quantity, unitPriceCents, subtotalCents, active: item.is_active };
  });
  const subtotalCents = cents(value.subtotal);
  if (new Set(items.map((item) => JSON.stringify([item.productId, item.size]))).size !== items.length || items.reduce((sum, item) => sum + item.subtotalCents, 0) !== subtotalCents) return invalid();
  return { items, subtotalCents };
}
export function cartQuantity(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const quantity = Number(value.trim());
  return Number.isSafeInteger(quantity) && quantity > 0 ? quantity : null;
}
export async function requestCart(client: ReturnType<typeof createApiClient>, token: string, signal: AbortSignal, change?: CartChange): Promise<ApiCart> {
  if (!change) return readApiCart(await client.request('/cart', { token, signal }));
  if (!Number.isSafeInteger(change.productId) || change.productId <= 0 || !change.size.trim() || (change.type !== 'remove' && (!Number.isSafeInteger(change.quantity) || (change.quantity ?? 0) <= 0))) throw new Error('Revisa producto, talla y cantidad antes de modificar el carrito.');
  const path = change.type === 'add' ? '/cart' : `/cart/${change.productId}${change.type === 'remove' ? `?size=${encodeURIComponent(change.size)}` : ''}`;
  const method = change.type === 'add' ? 'POST' : change.type === 'update' ? 'PUT' : 'DELETE';
  const json = change.type === 'remove' ? undefined : { ...(change.type === 'add' ? { product_id: change.productId } : {}), quantity: change.quantity, size: change.size };
  return readApiCart(await client.request(path, { method, json, token, signal }));
}
