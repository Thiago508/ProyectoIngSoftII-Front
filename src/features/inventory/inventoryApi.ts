import { ApiError, type createApiClient } from '../../shared/api/apiClient.ts';
export interface ApiInventoryRow { productId: number; size: string; quantity: number; reserved: number; available: number }
export interface InventoryDraft { productId: string; size: string; quantity: string; reason: string }
export type InventoryErrors = Partial<Record<keyof InventoryDraft, string>>;
export const emptyInventoryDraft: InventoryDraft = { productId: '', size: '', quantity: '', reason: '' };
function invalid(): never { throw new ApiError('La API devolvió inventario incompatible con el contrato.', { kind: 'response' }); }
function natural(value: unknown): value is number { return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0; }
export function readInventoryRow(value: unknown): ApiInventoryRow {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  const row = value as Record<string, unknown>;
  if (!natural(row.product_id) || row.product_id === 0 || typeof row.size !== 'string' || !row.size.trim() || !natural(row.quantity) || !natural(row.reserved) || !natural(row.available) || row.quantity - row.reserved !== row.available) return invalid();
  return { productId: row.product_id, size: row.size, quantity: row.quantity, reserved: row.reserved, available: row.available };
}
export function validateInventoryDraft(draft: InventoryDraft, rows: readonly ApiInventoryRow[], productIds: readonly number[]): InventoryErrors {
  const errors: InventoryErrors = {};
  const id = Number(draft.productId);
  if (!/^[1-9]\d*$/.test(draft.productId) || !Number.isSafeInteger(id) || !productIds.includes(id)) errors.productId = 'Selecciona un producto del servidor.';
  if (!draft.size.trim()) errors.size = 'Escribe la talla que vas a ajustar o crear.';
  const quantity = Number(draft.quantity.trim());
  if (!/^\d+$/.test(draft.quantity.trim()) || !natural(quantity)) errors.quantity = 'Escribe una cantidad física entera mayor o igual a cero.';
  else if (quantity < (rows.find((row) => row.productId === id && row.size === draft.size.trim())?.reserved ?? 0)) errors.quantity = 'La cantidad física no puede ser menor que las unidades reservadas consultadas. Actualiza la consulta si cambiaron.';
  if ([...draft.reason.trim()].length < 1 || [...draft.reason.trim()].length > 255) errors.reason = 'Escribe un motivo de entre 1 y 255 caracteres.';
  return errors;
}
export async function listApiInventory(client: ReturnType<typeof createApiClient>, token: string, signal: AbortSignal): Promise<ApiInventoryRow[]> {
  const value = await client.request('/inventory', { token, signal });
  if (!Array.isArray(value)) return invalid();
  const rows = value.map(readInventoryRow);
  if (new Set(rows.map((row) => JSON.stringify([row.productId, row.size]))).size !== rows.length) return invalid();
  return rows;
}
export async function adjustApiInventory(client: ReturnType<typeof createApiClient>, token: string, signal: AbortSignal, draft: InventoryDraft): Promise<ApiInventoryRow> {
  const productId = Number(draft.productId);
  if (Object.keys(validateInventoryDraft(draft, [], [productId])).length) throw new Error('Revisa los campos del ajuste antes de enviar.');
  const value = await client.request('/inventory/adjustments', { method: 'POST', token, signal, json: { product_id: productId, size: draft.size.trim(), new_quantity: Number(draft.quantity.trim()), reason: draft.reason.trim() } });
  const row = readInventoryRow(value);
  if (row.productId !== productId || row.size !== draft.size.trim() || row.quantity !== Number(draft.quantity.trim())) return invalid();
  return row;
}
export function inventoryFieldErrors(cause: unknown): InventoryErrors {
  const errors: InventoryErrors = {};
  if (!(cause instanceof ApiError) || cause.status !== 422) return errors;
  const map = { product_id: 'productId', size: 'size', new_quantity: 'quantity', reason: 'reason' } as const;
  for (const issue of cause.issues) {
    const key = Object.keys(map).find((key) => issue.path.includes(key)) as keyof typeof map | undefined;
    if (key) errors[map[key]] = issue.message;
  }
  return errors;
}
