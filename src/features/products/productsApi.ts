import { ApiError, type createApiClient } from '../../shared/api/apiClient.ts';
import { catalogPhotoUrl, readCatalogProduct, type CatalogProduct } from '../catalog/catalogApi.ts';

export interface AdminProduct { id: number; slug: string; sku: string | null; name: string; description: string; price: number; category: string; sizes: string[]; image: string; featured: boolean; active: boolean; display: CatalogProduct }
export interface ApiProductDraft { slug: string; sku: string; name: string; description: string; price: string; category: string; sizes: string; image: string; featured: boolean }
export type ProductField = Exclude<keyof ApiProductDraft, 'featured'>;
export type ApiProductErrors = Partial<Record<ProductField, string>>;
export const emptyApiProduct: ApiProductDraft = { slug: '', sku: '', name: '', description: '', price: '', category: '', sizes: '', image: '', featured: false };
function invalid(): never { throw new ApiError('La API devolvió productos incompatibles con el contrato.', { kind: 'response' }); }
export function readAdminProduct(value: unknown, base: string): AdminProduct {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  const raw = value as Record<string, unknown>;
  const display = readCatalogProduct(raw, base, true);
  if (typeof raw.category !== 'string' || typeof raw.featured !== 'boolean' || (raw.sku !== undefined && raw.sku !== null && typeof raw.sku !== 'string')) return invalid();
  return { id: Number(display.id), slug: String(raw.slug), sku: typeof raw.sku === 'string' ? raw.sku : null, name: display.name, description: display.description, price: display.priceCents / 100, category: raw.category, sizes: [...raw.sizes as string[]], image: String(raw.image), featured: raw.featured, active: display.active, display };
}
export function productDraft(product: AdminProduct): ApiProductDraft {
  return { slug: product.slug, sku: product.sku ?? '', name: product.name, description: product.description, price: String(product.price), category: product.category, sizes: product.sizes.join(', '), image: product.image, featured: product.featured };
}
export function validateApiProduct(draft: ApiProductDraft): ApiProductErrors {
  const errors: ApiProductErrors = {};
  for (const [field, min, max] of [['slug', 2, 120], ['name', 2, 160], ['category', 2, 60]] as const) {
    const length = [...draft[field].trim()].length;
    if (length < min || length > max) errors[field] = `Escribe entre ${min} y ${max} caracteres.`;
  }
  if (!draft.description.trim()) errors.description = 'Escribe la descripción del producto.';
  if ([...draft.sku.trim()].length > 80) errors.sku = 'El SKU admite hasta 80 caracteres.';
  const price = Number(draft.price.trim());
  if (!/^\d+$/.test(draft.price.trim()) || !Number.isSafeInteger(price * 100) || price <= 0) errors.price = 'Escribe un precio en pesos COP enteros, mayor que cero y sin separadores de miles.';
  const sizes = draft.sizes.trim() ? draft.sizes.split(',').map((size) => size.trim()) : [];
  if (sizes.some((size) => !size) || new Set(sizes).size !== sizes.length) errors.sizes = 'Separa las tallas con comas, sin valores vacíos ni repetidos.';
  if (draft.image.trim() && !catalogPhotoUrl(draft.image.trim(), 'https://images.example')) errors.image = 'Usa una URL HTTP/HTTPS o una ruta relativa del servidor, sin credenciales.';
  return errors;
}
export function productPayload(draft: ApiProductDraft, creating: boolean) {
  if (Object.keys(validateApiProduct(draft)).length) throw new Error('Revisa los campos del producto antes de enviar.');
  return { slug: draft.slug.trim(), sku: draft.sku.trim() || null, name: draft.name.trim(), description: draft.description.trim(), price: Number(draft.price.trim()), category: draft.category.trim(), sizes: draft.sizes.trim() ? draft.sizes.split(',').map((size) => size.trim()) : [], image: draft.image.trim(), featured: draft.featured, ...(creating ? { quantity: 0, is_active: true } : {}) };
}
export async function listApiProducts(client: ReturnType<typeof createApiClient>, base: string, signal: AbortSignal) {
  const value = await client.request('/products', { signal });
  if (!Array.isArray(value)) return invalid();
  const products = value.map((item) => readAdminProduct(item, base));
  if (new Set(products.map((product) => product.id)).size !== products.length) return invalid();
  return products;
}
export async function saveApiProduct(client: ReturnType<typeof createApiClient>, base: string, token: string, signal: AbortSignal, draft: ApiProductDraft, id?: number) {
  if (id !== undefined && (!Number.isSafeInteger(id) || id <= 0)) throw new Error('Producto inválido.');
  const product = readAdminProduct(await client.request(id === undefined ? '/products' : `/products/${id}`, { method: id === undefined ? 'POST' : 'PUT', token, signal, json: productPayload(draft, id === undefined) }), base);
  if (id !== undefined && product.id !== id) return invalid();
  return product;
}
export async function deactivateApiProduct(client: ReturnType<typeof createApiClient>, base: string, token: string, signal: AbortSignal, id: number) {
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Producto inválido.');
  const product = readAdminProduct(await client.request(`/products/${id}/deactivate`, { method: 'PATCH', token, signal }), base);
  if (product.id !== id || product.active) return invalid();
  return product;
}
export function apiProductErrors(cause: unknown): ApiProductErrors {
  const errors: ApiProductErrors = {};
  if (!(cause instanceof ApiError) || cause.status !== 422) return errors;
  const fields: readonly ProductField[] = ['slug', 'sku', 'name', 'description', 'price', 'category', 'sizes', 'image'];
  for (const issue of cause.issues) {
    const field = fields.find((field) => issue.path.includes(field));
    if (field) errors[field] = issue.message;
  }
  return errors;
}
