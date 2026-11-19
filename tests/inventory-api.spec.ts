import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { visitAsAdmin } from './adminFixtures.js';
import { authCors } from './authFixtures.js';
const headers = { ...authCors, 'Access-Control-Allow-Headers': 'authorization,content-type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
const product = { id: 7, slug: 'vestido', sku: null, name: 'Vestido API', description: '', price: 89900, category: 'Vestidos', sizes: ['M'], image: '', featured: false, stock_by_size: { M: 9 }, is_active: true };
const initial = { product_id: 7, size: 'M', quantity: 12, reserved: 3, available: 9 };
async function products(page: Page) {
  await page.route('**/api/v1/products', (route) => route.fulfill({ headers, json: [product, { ...product, id: 8, name: 'Producto sin stock', slug: 'nuevo', stock_by_size: {}, sizes: [] }] }));
}
async function fill(page: Page, quantity = '15', reason = 'Reconteo físico') {
  await page.getByLabel('Producto', { exact: true }).selectOption('7');
  await page.getByLabel('Talla', { exact: true }).fill('M');
  await page.getByLabel('Cantidad física nueva', { exact: true }).fill(quantity);
  await page.getByLabel('Motivo del ajuste', { exact: true }).fill(reason);
}
function row(page: Page, size: string) {
  return page.getByRole('row').filter({ has: page.getByRole('cell', { name: size, exact: true }) });
}

test('ajusta físico, acepta reservas concurrentes y crea una talla en cero sin doble envío', async ({ page }) => {
  await products(page);
  let rows = [initial]; let posts = 0;
  let release = () => {};
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/v1/inventory**', async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') { await route.fulfill({ headers, body: '' }); return; }
    expect(request.headers().authorization).toMatch(/^Bearer /);
    if (request.method() === 'GET') { await route.fulfill({ headers, json: rows }); return; }
    expect(new URL(request.url()).pathname).toBe('/api/v1/inventory/adjustments');
    posts++;
    const body = request.postDataJSON();
    if (posts === 1) {
      expect(body).toEqual({ product_id: 7, size: 'M', new_quantity: 15, reason: 'Reconteo físico' });
      await gate;
    } else expect(body).toEqual({ product_id: 8, size: 'XL', new_quantity: 0, reason: 'Primera talla' });
    const next = { product_id: body.product_id, size: body.size, quantity: body.new_quantity, reserved: posts === 1 ? 4 : 0, available: body.new_quantity - (posts === 1 ? 4 : 0) };
    rows = rows.some((item) => item.product_id === next.product_id && item.size === next.size) ? rows.map((item) => item.product_id === next.product_id && item.size === next.size ? next : item) : [...rows, next];
    await route.fulfill({ headers, json: next });
  });
  await visitAsAdmin(page, '/admin/inventory?source=api');
  await expect(row(page, 'M').getByRole('cell')).toHaveText(['M', '12', '3', '9', 'Ajustar']);
  await page.getByRole('button', { name: 'Ajustar producto 7, talla M', exact: true }).click();
  await expect(page.getByLabel('Cantidad física nueva', { exact: true })).toBeFocused();
  await page.getByLabel('Cantidad física nueva', { exact: true }).fill('2');
  await page.getByLabel('Motivo del ajuste', { exact: true }).fill('Reconteo físico');
  await page.getByRole('button', { name: 'Guardar ajuste', exact: true }).click();
  await expect(page.getByLabel('Cantidad física nueva', { exact: true })).toBeFocused();
  expect(posts).toBe(0);
  await page.getByLabel('Cantidad física nueva', { exact: true }).fill('15');
  await page.getByRole('button', { name: 'Guardar ajuste', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Procesando…', exact: true })).toBeDisabled();
  await expect.poll(() => posts).toBe(1); release();
  await expect(row(page, 'M').getByRole('cell')).toHaveText(['M', '15', '4', '11', 'Ajustar']);
  await expect(row(page, 'M').getByRole('rowheader')).toBeFocused();
  await expect(page.getByLabel('Motivo del ajuste', { exact: true })).toHaveValue('');
  await page.getByLabel('Producto', { exact: true }).selectOption('8');
  await page.getByLabel('Talla', { exact: true }).fill('XL');
  await page.getByLabel('Cantidad física nueva', { exact: true }).fill('0');
  await page.getByLabel('Motivo del ajuste', { exact: true }).fill('Primera talla');
  await page.getByRole('button', { name: 'Guardar ajuste', exact: true }).click();
  await expect(row(page, 'XL').getByRole('cell')).toHaveText(['XL', '0', '0', '0', 'Ajustar']);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('409 y 422 mantienen el borrador y muestran el rechazo del servidor', async ({ page }) => {
  await products(page); let writes = 0;
  await page.route('**/api/v1/inventory**', async (route) => {
    if (route.request().method() === 'GET') { await route.fulfill({ headers, json: [initial] }); return; }
    writes++;
    await route.fulfill({ headers, status: writes === 1 ? 409 : 422, json: writes === 1 ? { detail: 'Las reservas cambiaron' } : { detail: [{ loc: ['body', 'new_quantity'], msg: 'Cantidad rechazada por el servidor' }] } });
  });
  await visitAsAdmin(page, '/admin/inventory?source=api');
  await expect(page.getByRole('button', { name: 'Guardar ajuste', exact: true })).toBeEnabled(); await fill(page);
  await page.getByRole('button', { name: 'Guardar ajuste', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Las reservas cambiaron');
  await expect(page.getByRole('alert')).toBeFocused();
  await expect(page.getByLabel('Motivo del ajuste', { exact: true })).toHaveValue('Reconteo físico');
  await page.getByRole('button', { name: 'Guardar ajuste', exact: true }).click();
  await expect(page.getByLabel('Cantidad física nueva', { exact: true })).toBeFocused();
  await expect(page.getByLabel('Cantidad física nueva', { exact: true })).toHaveAccessibleDescription(/Cantidad rechazada por el servidor/);
  expect(writes).toBe(2);
});

test('un ajuste incierto requiere consultar antes de volver a escribir', async ({ page }) => {
  await products(page); let writes = 0;
  await page.route('**/api/v1/inventory**', async (route) => {
    if (route.request().method() === 'GET') { await route.fulfill({ headers, json: [{ ...initial, quantity: writes ? 15 : 12, available: writes ? 12 : 9 }] }); return; }
    writes++; await route.abort();
  });
  await visitAsAdmin(page, '/admin/inventory?source=api');
  await expect(page.getByRole('button', { name: 'Guardar ajuste', exact: true })).toBeEnabled(); await fill(page);
  await page.getByRole('button', { name: 'Guardar ajuste', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('El ajuste podría haberse aplicado');
  await expect(page.getByRole('button', { name: 'Guardar ajuste', exact: true })).toBeDisabled();
  expect(writes).toBe(1);
  await page.getByRole('button', { name: 'Consultar inventario', exact: true }).click();
  await expect(row(page, 'M').getByRole('cell')).toHaveText(['M', '15', '3', '12', 'Ajustar']);
  await expect(page.getByLabel('Producto', { exact: true })).toHaveValue('');
  expect(writes).toBe(1);
});

test('403 conserva sesión y 401 retira el inventario protegido', async ({ page }) => {
  await products(page); let status = 403;
  await page.route('**/api/v1/inventory**', (route) => route.fulfill({ headers, status, json: { detail: 'Acceso rechazado' } }));
  await visitAsAdmin(page, '/admin/inventory?source=api');
  await expect(page.getByRole('alert')).toHaveText('No tienes permiso para consultar el inventario.');
  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
  status = 401;
  await page.getByRole('button', { name: 'Consultar inventario', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText('Tu sesión venció. Vuelve a iniciar sesión.', { exact: true })).toBeVisible();
});

test('vacío y reintento de lectura no se sustituyen por inventario demo', async ({ page }) => {
  await products(page); let failed = true;
  await page.route('**/api/v1/inventory**', (route) => route.fulfill({ headers, status: failed ? 503 : 200, json: failed ? { detail: 'Inventario temporalmente caído' } : [] }));
  await visitAsAdmin(page, '/admin/inventory?source=api');
  await expect(page.getByRole('alert')).toHaveText('Inventario temporalmente caído');
  await expect(page.getByRole('button', { name: 'Guardar ajuste', exact: true })).toBeDisabled(); failed = false;
  await page.getByRole('button', { name: 'Consultar inventario', exact: true }).click();
  await expect(page.getByText('No hay existencias por talla registradas. Selecciona un producto para ingresar su primera talla.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Guardar ajuste', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: /Reservar DEMO/ })).toHaveCount(0);
});

test('el rechazo de una escritura conserva sesión en 403 y la invalida en 401', async ({ page }) => {
  await products(page); let code = 403;
  await page.route('**/api/v1/inventory**', (route) => route.fulfill({ headers, status: route.request().method() === 'GET' ? 200 : code, json: route.request().method() === 'GET' ? [initial] : { detail: 'No autorizado' } }));
  await visitAsAdmin(page, '/admin/inventory?source=api');
  await expect(page.getByRole('button', { name: 'Guardar ajuste', exact: true })).toBeEnabled(); await fill(page);
  await page.getByRole('button', { name: 'Guardar ajuste', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('No tienes permiso para ajustar inventario.');
  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
  code = 401;
  await page.getByRole('button', { name: 'Guardar ajuste', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText('Tu sesión venció. Vuelve a iniciar sesión.', { exact: true })).toBeVisible();
});
