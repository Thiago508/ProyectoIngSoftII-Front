import { ApiError, type createApiClient } from '../../shared/api/apiClient.ts';
import type { Product } from '../products/demo/productsDemo';

export interface CatalogProduct extends Product {
  availability?: { sku: string; size: string; available: number }[];
}
type Client = ReturnType<typeof createApiClient>;
function object(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function invalid(): never { throw new ApiError('La API devolvió un catálogo incompatible con el contrato.', { kind: 'response' }); }
function integer(value: unknown): value is number { return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0; }
export function catalogPhotoUrl(value: string, baseUrl: string): string | undefined {
  if (!value.trim()) return;
  try {
    // Las rutas relativas pertenecen al servidor de imágenes del backend, no al frontend.
    const url = new URL(value, `${new URL(baseUrl).origin}/`);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return;
    return url.href;
  } catch { return; }
}
export function readCatalogProduct(value: unknown, baseUrl: string, detail = false): CatalogProduct {
  if (!object(value) || !integer(value.id) || value.id === 0 || typeof value.slug !== 'string' ||
      typeof value.name !== 'string' || !value.name.trim() || typeof (value.description ?? '') !== 'string' ||
      !integer(value.price) || !Number.isSafeInteger(value.price * 100) ||
      (value.currency !== undefined && value.currency !== 'COP') ||
      typeof value.image !== 'string' || (value.is_active !== undefined && typeof value.is_active !== 'boolean') ||
      !Array.isArray(value.sizes) || !value.sizes.every((size) => typeof size === 'string' && size.trim())) return invalid();
  if (!detail && typeof value.is_active !== 'boolean') return invalid();
  const src = catalogPhotoUrl(value.image, baseUrl);
  const product: CatalogProduct = {
    id: String(value.id), code: typeof value.sku === 'string' && value.sku ? value.sku : value.slug,
    name: value.name, description: String(value.description ?? ''), priceCents: value.price * 100,
    active: value.is_active !== false,
    image: src ? { src, alt: value.name, source: 'remote' } : undefined,
  };
  if (detail) {
    if (!object(value.stock_by_size)) return invalid();
    product.availability = Object.entries(value.stock_by_size).map(([size, available]) => {
      if (!size.trim() || !integer(available)) return invalid();
      return { sku: size, size, available };
    });
  }
  return product;
}
export async function loadApiCatalog(client: Client, baseUrl: string, productId: string | undefined, signal: AbortSignal): Promise<CatalogProduct[]> {
  if (productId) {
    if (!/^[1-9]\d*$/.test(productId) || !Number.isSafeInteger(Number(productId))) return [];
    try {
      const product = readCatalogProduct(await client.request(`/products/${productId}`, { signal }), baseUrl, true);
      if (product.id !== productId) return invalid();
      return product.active ? [product] : [];
    } catch (cause) { if (cause instanceof ApiError && cause.status === 404) return []; throw cause; }
  }
  const value = await client.request('/catalog', { signal });
  if (!object(value) || !Array.isArray(value.items) || !integer(value.count)) return invalid();
  const products = value.items.map((item) => readCatalogProduct(item, baseUrl));
  if (new Set(products.map((product) => product.id)).size !== products.length) return invalid();
  return products.filter((product) => product.active);
}
