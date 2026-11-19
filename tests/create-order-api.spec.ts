import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { signInAs } from './adminFixtures.js';
import { authCors } from './authFixtures.js';
const headers = { ...authCors, 'Access-Control-Allow-Headers': 'authorization,content-type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
const item = { product_id: 7, name: 'Vestido API', size: 'M', quantity: 2, unit_price: 89900, line_subtotal: 179800, is_active: true };
const order = { id: 77, user_id: 21, status: 'pendiente', reservation_state: 'activa', total: 179800, created_at: '2026-11-19T12:00:00', reservation_expires_at: '2026-11-19T12:15:00', items: [{ id: 1, product_id: 7, name: 'Vestido API', size: 'M', quantity: 2, unit_price: 89900 }], payment: null };
async function navigate(page: Page, path: string) { await page.evaluate((path) => { history.pushState({}, '', path); dispatchEvent(new PopStateEvent('popstate')); }, path); }
async function mockCart(page: Page, getItems: () => typeof item[]) {
  await page.route('**/api/v1/cart', (route) => { const items = getItems(); return route.fulfill({ headers, json: { items, subtotal: items.reduce((sum, item) => sum + item.line_subtotal, 0) } }); });
}
async function review(page: Page) { await signInAs(page, 'cliente'); await navigate(page, '/checkout/review?source=api'); await expect(page.getByText('Subtotal consultado:', { exact: false })).toBeVisible(); }
async function confirm(page: Page) { await page.getByLabel('Revisé los productos, tallas y cantidades.', { exact: true }).check(); await page.getByRole('button', { name: 'Crear pedido pendiente de pago', exact: true }).click(); }

test('crea una sola vez con items y conserva el resultado al volver desde el detalle', async ({ page }) => {
  let writes = 0; let created = false; let release = () => {};
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await mockCart(page, () => created ? [] : [item]);
  await page.route('**/api/v1/orders', async (route) => {
    if (route.request().method() === 'OPTIONS') { await route.fulfill({ headers, body: '' }); return; }
    writes++; expect(route.request().method()).toBe('POST'); expect(route.request().headers().authorization).toMatch(/^Bearer /);
    expect(route.request().postDataJSON()).toEqual({ items: [{ product_id: 7, size: 'M', quantity: 2 }] });
    await gate; created = true; await route.fulfill({ headers, status: 201, json: order });
  });
  await page.route('**/api/v1/orders/77', (route) => route.fulfill({ headers, json: order }));
  await signInAs(page, 'cliente'); await navigate(page, '/cart?source=api');
  await page.getByRole('link', { name: 'Continuar con la compra', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Crear pedido pendiente de pago', exact: true })).toBeDisabled();
  await expect(page.getByText('cliente@example.com', { exact: false })).toBeVisible();
  await confirm(page); await expect.poll(() => writes).toBe(1);
  await expect(page.getByRole('button', { name: 'Creando pedido…', exact: true })).toBeDisabled();
  expect(await page.evaluate(() => sessionStorage.getItem('fashion.pending-order-request'))).toBe('pending');
  release(); await expect(page.getByRole('heading', { name: 'Pedido recibido', exact: true })).toBeFocused();
  await expect(page.getByText('Estado del servidor: pendiente', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Carrito de compras: 0 unidades', exact: true })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.length)).toBe(0);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('link', { name: 'Ver pedido #77', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Pedido #77', exact: true })).toBeVisible();
  await page.goBack(); await expect(page.getByRole('heading', { name: 'Pedido recibido', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Crear pedido pendiente de pago', exact: true })).toHaveCount(0); expect(writes).toBe(1);
});

test('409 exige consultar el carrito y revisar de nuevo antes de otro envío', async ({ page }) => {
  let writes = 0; let quantity = 2;
  await mockCart(page, () => [{ ...item, quantity, line_subtotal: 89900 * quantity }]);
  await page.route('**/api/v1/orders', (route) => { writes++; quantity = 1; return route.fulfill({ headers, status: writes === 1 ? 409 : 201, json: writes === 1 ? { detail: 'Stock insuficiente' } : { ...order, total: 89900, items: [{ ...order.items[0], quantity: 1 }] } }); });
  await review(page); await confirm(page);
  await expect(page.getByRole('alert')).toHaveText('Stock insuficiente'); expect(writes).toBe(1);
  expect(await page.evaluate(() => sessionStorage.length)).toBe(0);
  await page.getByRole('button', { name: 'Actualizar carrito para revisar de nuevo', exact: true }).click();
  await expect(page.getByLabel('Revisé los productos, tallas y cantidades.', { exact: true })).not.toBeChecked();
  await expect(page.getByRole('button', { name: 'Crear pedido pendiente de pago', exact: true })).toBeDisabled();
  await confirm(page); await expect(page.getByRole('heading', { name: 'Pedido recibido', exact: true })).toBeVisible(); expect(writes).toBe(2);
});

test('resultado incierto no reenvía al navegar ni al recargar e iniciar sesión de nuevo', async ({ page }) => {
  let writes = 0; await mockCart(page, () => [item]);
  await page.route('**/api/v1/orders', async (route) => { writes++; await route.abort(); });
  await review(page); await confirm(page);
  await expect(page.getByRole('heading', { name: 'Resultado de creación sin confirmar', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Volver al carrito', exact: true }).click();
  await page.getByRole('link', { name: 'Continuar con la compra', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Crear pedido pendiente de pago', exact: true })).toHaveCount(0);
  await page.reload(); await page.getByRole('link', { name: 'Inicia sesión para revisar tu compra', exact: true }).click();
  await page.getByLabel('Correo electrónico', { exact: true }).fill('cliente@example.com'); await page.getByLabel('Contraseña', { exact: true }).fill('prueba123');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Resultado de creación sin confirmar', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Crear pedido pendiente de pago', exact: true })).toHaveCount(0);
  expect(writes).toBe(1);
  expect(await page.evaluate(() => ({ local: localStorage.length, entries: Object.entries(sessionStorage) }))).toEqual({ local: 0, entries: [['fashion.pending-order-request', 'pending']] });
});

test('respuesta incompatible con referencia se recupera con GET sin otro POST', async ({ page }) => {
  let writes = 0; let reads = 0; await mockCart(page, () => [item]);
  await page.route('**/api/v1/orders', (route) => { writes++; return route.fulfill({ headers, status: 201, json: { ...order, total: 'incorrecto' } }); });
  await page.route('**/api/v1/orders/77', (route) => { reads++; return route.fulfill({ headers, json: order }); });
  await review(page); await confirm(page);
  await expect(page.getByText('Referencia recibida: 77', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Consultar pedido recibido', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Pedido recibido', exact: true })).toBeVisible();
  expect(writes).toBe(1); expect(reads).toBe(1); expect(await page.evaluate(() => sessionStorage.length)).toBe(0);
});

test('carrito vacío, cantidades mayores a 20 e inactivos no permiten crear', async ({ page }) => {
  let items = [{ ...item, quantity: 21, line_subtotal: 1887900 }]; let writes = 0;
  await mockCart(page, () => items);
  await page.route('**/api/v1/orders', (route) => { writes++; return route.fulfill({ headers, json: order }); });
  await review(page); await expect(page.getByRole('alert')).toContainText('1 a 20');
  await expect(page.getByRole('button', { name: 'Crear pedido pendiente de pago', exact: true })).toBeDisabled();
  items = [{ ...item, is_active: false }]; await page.getByRole('link', { name: 'Volver al carrito', exact: true }).click();
  await page.getByRole('link', { name: 'Continuar con la compra', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('inactivo');
  items = []; await page.getByRole('link', { name: 'Volver al carrito', exact: true }).click(); await navigate(page, '/checkout/review?source=api');
  await expect(page.getByRole('alert')).toHaveText('El carrito está vacío.'); expect(writes).toBe(0);
});

test('403 conserva sesión y 401 la invalida sin dejar una solicitud incierta', async ({ page }) => {
  let code = 403; await mockCart(page, () => [item]);
  await page.route('**/api/v1/orders', (route) => route.fulfill({ headers, status: code, json: { detail: 'No autorizado' } }));
  await review(page); await confirm(page);
  await expect(page.getByRole('alert')).toHaveText('No tienes permiso para crear este pedido.');
  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible(); code = 401;
  await page.getByRole('button', { name: 'Actualizar carrito para revisar de nuevo', exact: true }).click(); await confirm(page);
  await expect(page.getByRole('link', { name: 'Inicia sesión para revisar tu compra', exact: true })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.length)).toBe(0);
});
