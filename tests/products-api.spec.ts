import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { visitAsAdmin } from './adminFixtures.js';
import { authCors } from './authFixtures.js';
const headers = { ...authCors, 'Access-Control-Allow-Headers': 'authorization,content-type', 'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,OPTIONS' };
const product = { id: 7, slug: 'vestido', sku: 'VEST-01', name: 'Vestido API', description: 'Floral', price: 89900, currency: 'COP', category: 'Vestidos', sizes: ['M'], image: '', featured: false, stock_by_size: { M: 4 }, is_active: true };
async function fill(page: Page) {
  await page.getByLabel('Slug del producto', { exact: true }).fill('nuevo');
  await page.getByLabel('Nombre del producto', { exact: true }).fill('Producto nuevo');
  await page.getByLabel('Descripción del producto', { exact: true }).fill('Descripción de prueba');
  await page.getByLabel('Precio en COP', { exact: true }).fill('65000');
  await page.getByLabel('Categoría', { exact: true }).fill('Blusas');
  await page.getByLabel('Tallas separadas por comas', { exact: true }).fill('S, M');
}

test('crea, edita y desactiva con Bearer sin modificar cantidades de inventario', async ({ page }) => {
  let items = [product];
  let posts = 0;
  let release = () => {};
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/v1/products**', async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') { await route.fulfill({ headers, body: '' }); return; }
    if (request.method() === 'GET') { await route.fulfill({ headers, json: items }); return; }
    expect(request.headers().authorization).toMatch(/^Bearer /);
    if (request.method() === 'POST') {
      posts++;
      expect(request.postDataJSON()).toEqual({ slug: 'nuevo', sku: null, name: 'Producto nuevo', description: 'Descripción de prueba', price: 65000, category: 'Blusas', sizes: ['S', 'M'], image: '', featured: false, quantity: 0, is_active: true });
      await gate;
      const next = { ...product, ...request.postDataJSON(), id: 8, stock_by_size: {} };
      items = [...items, next];
      await route.fulfill({ status: 201, headers, json: next }); return;
    }
    const target = items.find((item) => item.id === 8)!;
    if (request.method() === 'PATCH') {
      expect(new URL(request.url()).pathname).toBe('/api/v1/products/8/deactivate');
      expect(request.postData()).toBeNull();
      const next = { ...target, is_active: false }; items = items.map((item) => item.id === 8 ? next : item);
      await route.fulfill({ headers, json: next }); return;
    }
    const body = request.postDataJSON();
    expect(body).not.toHaveProperty('quantity'); expect(body).not.toHaveProperty('active'); expect(body).not.toHaveProperty('is_active');
    const next = { ...target, ...body }; items = items.map((item) => item.id === 8 ? next : item);
    await route.fulfill({ headers, json: next });
  });
  await visitAsAdmin(page, '/admin/products?source=api');
  await expect(page.getByRole('button', { name: 'Crear producto', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Crear producto', exact: true }).click();
  await expect(page.getByLabel('Slug del producto', { exact: true })).toBeFocused();
  await fill(page);
  await page.getByLabel('Precio en COP', { exact: true }).fill('65000.50');
  await page.getByRole('button', { name: 'Crear producto', exact: true }).click();
  await expect(page.getByLabel('Precio en COP', { exact: true })).toBeFocused();
  expect(posts).toBe(0);
  await page.getByLabel('Precio en COP', { exact: true }).fill('65000');
  await page.getByLabel('Descripción del producto', { exact: true }).fill(' ');
  await page.getByRole('button', { name: 'Crear producto', exact: true }).click();
  await expect(page.getByLabel('Descripción del producto', { exact: true })).toBeFocused();
  expect(posts).toBe(0);
  await page.getByLabel('Descripción del producto', { exact: true }).fill('Descripción de prueba');
  await page.getByRole('button', { name: 'Crear producto', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Procesando…', exact: true })).toBeDisabled();
  await expect.poll(() => posts).toBe(1); release();
  await expect(page.getByRole('heading', { level: 3, name: 'Producto nuevo', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Desactivar nuevo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Desactivar nuevo', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Editar nuevo', exact: true }).click();
  await expect(page.getByLabel('Slug del producto', { exact: true })).toBeFocused();
  await page.getByLabel('Nombre del producto', { exact: true }).fill('Producto actualizado');
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
  await expect(page.getByRole('heading', { level: 3, name: 'Producto actualizado', exact: true })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Desactivar nuevo', exact: true })).toBeDisabled();
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('409 y 422 conservan borrador y enfocan errores sin repetir escrituras', async ({ page }) => {
  let writes = 0;
  await page.route('**/api/v1/products', async (route) => {
    if (route.request().method() === 'GET') { await route.fulfill({ headers, json: [product] }); return; }
    writes++;
    await route.fulfill({ headers, status: writes === 1 ? 409 : 422, json: writes === 1 ? { detail: 'Slug duplicado' } : { detail: [{ loc: ['body', 'name'], msg: 'Nombre no admitido' }] } });
  });
  await visitAsAdmin(page, '/admin/products?source=api');
  await expect(page.getByRole('button', { name: 'Crear producto', exact: true })).toBeEnabled();
  await fill(page);
  await page.getByRole('button', { name: 'Crear producto', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Slug duplicado');
  await expect(page.getByRole('alert')).toBeFocused();
  await expect(page.getByLabel('Slug del producto', { exact: true })).toHaveValue('nuevo');
  await page.getByRole('button', { name: 'Crear producto', exact: true }).click();
  await expect(page.getByLabel('Nombre del producto', { exact: true })).toBeFocused();
  await expect(page.getByLabel('Nombre del producto', { exact: true })).toHaveAccessibleDescription('Nombre no admitido');
  expect(writes).toBe(2);
});

test('alta incierta bloquea nuevos envíos hasta consultar y limpiar el formulario', async ({ page }) => {
  let writes = 0;
  let created = false;
  await page.route('**/api/v1/products', async (route) => {
    if (route.request().method() === 'GET') { await route.fulfill({ headers, json: created ? [product, { ...product, id: 8, slug: 'nuevo', name: 'Producto nuevo' }] : [product] }); return; }
    writes++; created = true; await route.abort();
  });
  await visitAsAdmin(page, '/admin/products?source=api');
  await expect(page.getByRole('button', { name: 'Crear producto', exact: true })).toBeEnabled();
  await fill(page);
  await page.getByRole('button', { name: 'Crear producto', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('El cambio podría haberse aplicado');
  await expect(page.getByRole('button', { name: 'Crear producto', exact: true })).toBeDisabled();
  expect(writes).toBe(1);
  await page.getByRole('button', { name: 'Consultar productos', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Producto nuevo', exact: true })).toBeVisible();
  await expect(page.getByLabel('Slug del producto', { exact: true })).toHaveValue('');
  expect(writes).toBe(1);
});

test('403 conserva la sesión; 401 retira administración', async ({ page }) => {
  let code = 403;
  await page.route('**/api/v1/products**', (route) => route.fulfill({ headers, status: route.request().method() === 'GET' ? 200 : code, json: route.request().method() === 'GET' ? [product] : { detail: 'No autorizado' } }));
  await visitAsAdmin(page, '/admin/products?source=api');
  await page.getByRole('button', { name: 'Desactivar vestido', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('No tienes permiso para modificar productos.');
  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
  code = 401;
  await page.getByRole('button', { name: 'Desactivar vestido', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText('Tu sesión venció. Vuelve a iniciar sesión.', { exact: true })).toBeVisible();
});

test('fallo de lectura requiere reintentar antes de editar y vacío no muestra demo', async ({ page }) => {
  let failed = true;
  await page.route('**/api/v1/products', (route) => route.fulfill({ headers, status: failed ? 503 : 200, json: failed ? { detail: 'Servicio caído' } : [] }));
  await visitAsAdmin(page, '/admin/products?source=api');
  await expect(page.getByRole('alert')).toHaveText('Servicio caído');
  await expect(page.getByRole('button', { name: 'Crear producto', exact: true })).toBeDisabled();
  failed = false;
  await page.getByRole('button', { name: 'Consultar productos', exact: true }).click();
  await expect(page.getByText('No hay productos para mostrar.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Crear producto', exact: true })).toBeEnabled();
});

test('login conserva la fuente API y cancelar edición no envía cambios', async ({ page }) => {
  let writes = 0;
  await page.route('**/api/v1/products**', async (route) => {
    if (route.request().method() !== 'GET') writes++;
    await route.fulfill({ headers, json: [product] });
  });
  await visitAsAdmin(page, '/admin/products?source=api');
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await page.goto('/admin/products?source=api');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Correo electrónico', { exact: true }).fill('cliente@example.com');
  await page.getByLabel('Contraseña', { exact: true }).fill('prueba123');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/products\?source=api$/);
  await page.getByRole('button', { name: 'Editar vestido', exact: true }).click();
  await page.getByLabel('Nombre del producto', { exact: true }).fill('Borrador sin guardar');
  await page.getByRole('button', { name: 'Cancelar edición', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Editar vestido', exact: true })).toBeFocused();
  await expect(page.getByLabel('Nombre del producto', { exact: true })).toHaveValue('');
  await expect(page.getByRole('heading', { level: 3, name: 'Vestido API', exact: true })).toBeVisible();
  expect(writes).toBe(0);
});
