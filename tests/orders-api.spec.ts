import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { signInAs } from './adminFixtures.js';
import { authCors } from './authFixtures.js';
const headers = { ...authCors, 'Access-Control-Allow-Headers': 'authorization', 'Access-Control-Allow-Methods': 'GET,OPTIONS' };
const order = { id: 7, user_id: 21, status: 'pendiente', reservation_state: 'activa', total: 89900, currency: 'COP', created_at: '2026-11-19T10:05:00', reservation_expires_at: '2026-11-19T10:20:00', items: [{ id: 1, product_id: 4, name: 'Vestido histórico', size: 'M', quantity: 1, unit_price: 89900 }], payment: null };
async function navigate(page: Page, path: string) { await page.evaluate((path) => { history.pushState({}, '', path); dispatchEvent(new PopStateEvent('popstate')); }, path); }

test('login vuelve al pedido, conserva datos históricos y actualiza solo con GET', async ({ page }) => {
  let paid = false; const methods: string[] = [];
  await page.route('**/api/v1/orders/7', (route) => {
    if (route.request().method() !== 'OPTIONS') { methods.push(route.request().method()); expect(route.request().headers().authorization).toMatch(/^Bearer /); }
    return route.fulfill({ headers, json: { ...order, status: paid ? 'pagado' : 'pendiente', payment: paid ? { id: 2, order_id: 7, amount: 89900, method: 'card', status: 'aprobado' } : null } });
  });
  await signInAs(page, 'cliente'); await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await navigate(page, '/orders/7?source=api');
  await page.getByRole('link', { name: 'Inicia sesión para consultar tus pedidos', exact: true }).click();
  await page.getByLabel('Correo electrónico', { exact: true }).fill('cliente@example.com');
  await page.getByLabel('Contraseña', { exact: true }).fill('prueba123');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL(/\/orders\/7\?source=api$/);
  await expect(page.getByRole('heading', { name: 'Pedido #7', exact: true })).toBeFocused();
  await expect(page.getByRole('heading', { name: 'Vestido histórico', exact: true })).toBeVisible();
  await expect(page.locator('time').first()).toHaveText(order.created_at);
  await expect(page.getByText('Estado del servidor: pendiente', { exact: true })).toBeVisible();
  await expect(page.getByText('El servidor no informó datos de envío para este pedido.', { exact: true })).toBeVisible();
  await expect(page.getByText('El servidor no informó un registro de pago.', { exact: true })).toBeVisible();
  paid = true; await page.getByRole('button', { name: 'Actualizar estado del pedido', exact: true }).click();
  await expect(page.getByText('Estado del servidor: pagado', { exact: true })).toBeVisible();
  await expect(page.getByText('Estado: aprobado', { exact: true })).toBeVisible();
  expect(methods.every((method) => method === 'GET')).toBe(true);
  await expect(page.getByRole('button', { name: /Pagar|Crear pedido|Cancelar pedido/ })).toHaveCount(0);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('consulta por ID valida entrada y oculta pedidos inexistentes o ajenos', async ({ page }) => {
  let calls = 0;
  await page.route('**/api/v1/orders/*', (route) => {
    calls++;
    const foreign = route.request().url().endsWith('/8');
    return route.fulfill({ headers, status: foreign ? 200 : 404, json: foreign ? { ...order, id: 8, user_id: 22, shipping_address: 'Dirección privada ajena', items: [{ ...order.items[0], name: 'Producto privado ajeno' }] } : { detail: 'No existe' } });
  });
  await signInAs(page, 'cliente'); await navigate(page, '/orders?source=api');
  await page.getByLabel('ID del pedido', { exact: true }).fill('0');
  await page.getByRole('button', { name: 'Consultar pedido', exact: true }).click();
  await expect(page.getByLabel('ID del pedido', { exact: true })).toBeFocused(); expect(calls).toBe(0);
  await page.getByLabel('ID del pedido', { exact: true }).fill('99');
  await page.getByRole('button', { name: 'Consultar pedido', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Pedido no disponible', exact: true })).toBeVisible();
  await page.getByLabel('ID del pedido', { exact: true }).fill('8');
  await page.getByRole('button', { name: 'Consultar pedido', exact: true }).click();
  await expect(page).toHaveURL(/\/orders\/8\?source=api$/);
  await expect(page.getByRole('heading', { name: 'Pedido no disponible', exact: true })).toBeVisible();
  await expect(page.getByText('Dirección privada ajena', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Producto privado ajeno', { exact: true })).toHaveCount(0);
});

test('error recuperable, 403 conserva sesión y 401 retira el detalle privado', async ({ page }) => {
  let status = 503;
  await page.route('**/api/v1/orders/7', (route) => route.fulfill({ headers, status, json: status === 200 ? { ...order, shipping_address: 'Calle privada del pedido' } : { detail: 'Consulta rechazada' } }));
  await signInAs(page, 'cliente'); await navigate(page, '/orders/7?source=api');
  await expect(page.getByRole('alert')).toHaveText('Consulta rechazada'); status = 403;
  await page.getByRole('button', { name: 'Reintentar consulta', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('No tienes permiso para consultar este pedido.');
  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible(); status = 200;
  await page.getByRole('button', { name: 'Reintentar consulta', exact: true }).click();
  await expect(page.getByText('Calle privada del pedido', { exact: true })).toBeVisible(); status = 401;
  await page.getByRole('button', { name: 'Actualizar estado del pedido', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Inicia sesión para consultar tus pedidos', exact: true })).toBeVisible();
  await expect(page.getByText('Calle privada del pedido', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Tu sesión venció. Vuelve a iniciar sesión.', { exact: true })).toBeVisible();
});

test('una notificación real abre el pedido real sin usar el detalle demo', async ({ page }) => {
  await page.route('**/api/v1/notifications', (route) => route.fulfill({ headers, json: [{ id: 1, user_id: 21, order_id: 7, event: 'order_created', resulting_status: 'pendiente', message: 'Pedido registrado', processing_status: 'processed', attempt_count: 1, is_read: true }] }));
  await page.route('**/api/v1/orders/7', (route) => route.fulfill({ headers, json: order }));
  await signInAs(page, 'cliente'); await navigate(page, '/notifications?source=api');
  await page.getByRole('link', { name: 'Ver pedido #7', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Pedido #7', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page.getByRole('heading', { name: 'Vestido histórico', exact: true })).toHaveCount(0);
});
