export interface Product {
  id: string;
  code: string;
  name: string;
  description: string;
  priceCents: number;
  active: boolean;
}
export interface ProductDraft { code: string; name: string; description: string; price: string }
export type ProductErrors = Partial<Record<keyof ProductDraft, string>>;

export const productsDemo: readonly Product[] = [
  { id: 'demo-dress', code: 'DEMO-VEST', name: 'Vestido midi estampado', description: 'Vestido midi con estampado floral.', priceCents: 8990000, active: true },
  { id: 'demo-blouse', code: 'DEMO-BLUSA', name: 'Blusa manga larga', description: 'Blusa femenina de manga larga.', priceCents: 5990000, active: true },
];

// Registro local de demostración. No autoriza administradores ni crea stock.
function saveDemoProduct(products: readonly Product[], draft: ProductDraft, editingId?: string):
  { ok: false; errors: ProductErrors } | { ok: true; products: Product[]; product: Product } {
  const isEditing = editingId !== undefined;
  const existing = isEditing ? products.find((product) => product.id === editingId) : undefined;
  const code = draft.code.trim().toUpperCase();
  const name = draft.name.trim();
  const description = draft.description.trim();
  const rawPrice = draft.price.trim();
  const errors: ProductErrors = {};
  // Dinero en centavos enteros para evitar acumular errores de punto flotante.
  const parts = rawPrice.replace(',', '.').split('.');
  const priceCents = Number(parts[0]) * 100 + Number((parts[1] ?? '').padEnd(2, '0'));
  if (!code) errors.code = 'Escribe el identificador comercial.';
  else if (products.some((product) => product.id !== editingId && product.code.toUpperCase() === code)) errors.code = 'Ya existe un producto con este identificador comercial.';
  if (isEditing && !existing) errors.code = 'El producto a editar ya no existe en esta sesión.';
  if (!name) errors.name = 'Escribe el nombre del producto.';
  if (!description) errors.description = 'Escribe la descripción del producto.';
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(rawPrice) || !Number.isSafeInteger(priceCents) || priceCents <= 0) errors.price = 'Escribe un precio mayor que cero, sin separadores de miles y con hasta dos decimales.';
  if (Object.keys(errors).length) return { ok: false, errors };
  const product: Product = { id: existing?.id ?? crypto.randomUUID(), code, name, description, priceCents, active: existing?.active ?? true };
  return { ok: true, products: existing ? products.map((candidate) => candidate.id === editingId ? product : candidate) : [...products, product], product };
}


export function createDemoProduct(products: readonly Product[], draft: ProductDraft) {
  return saveDemoProduct(products, draft);
}

export function updateDemoProduct(products: readonly Product[], productId: string, draft: ProductDraft) {
  return saveDemoProduct(products, draft, productId);
}

export function deactivateDemoProduct(products: readonly Product[], productId: string):
  { ok: false; message: string } | { ok: true; products: Product[]; product: Product } {
  const existing = products.find((product) => product.id === productId);
  if (!existing) return { ok: false, message: 'El producto ya no existe en esta sesión.' };
  const product = { ...existing, active: false };
  return { ok: true, product, products: products.map((candidate) => candidate.id === productId ? product : candidate) };
}
