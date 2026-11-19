import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { signInAs } from './adminFixtures.js';
import { authCors } from './authFixtures.js';
const headers = { ...authCors, 'Access-Control-Allow-Headers': 'authorization,content-type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
const order = { id: 7, user_id: 21, status: 'pendiente_pago', reservation_state: 'activa', total: 89900, reservation_expires_at: '2026-11-19T10:15:00', items: [], payment: null };
const approved = { ...order, status: 'pagado', reservation_state: 'consumida', payment: { id: 1, order_id: 7, amount: 89900, method: 'card', status: 'aprobado' } };
async function navigate(page: Page, path: string) { await page.evaluate((path) => { history.pushState({}, '', path); dispatchEvent(new PopStateEvent('popstate')); }, path); }
async function openPayment(page: Page) { await signInAs(page, 'cliente'); await navigate(page, '/orders/7/payment?source=api'); }
async function pay(page: Page, token = 'tok_ok') { await page.getByLabel('Token de tarjeta de prueba', { exact: true }).selectOption(token); await page.getByRole('button', { name: 'Enviar pago de prueba', exact: true }).click(); }

test('pago usa token explícito, bloquea doble envío y confirma solo tras GET', async ({ page }) => {
  let paid = false; let posts = 0; let release = () => {};
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/v1/orders/7', (route) => route.fulfill({ headers, json: paid ? approved : order }));
  await page.route('**/api/v1/orders/7/checkout', async (route) => {
    posts++; expect(route.request().method()).toBe('POST'); expect(route.request().headers().authorization).toMatch(/^Bearer /);
    expect(route.request().postDataJSON()).toEqual({ method: 'card', card_token: 'tok_ok' });
    await gate; paid = true;
    // El POST todavía dice pendiente: la UI debe usar el GET posterior como confirmación.
    await route.fulfill({ headers, json: order });
  });
  await openPayment(page);
  await expect(page.getByRole('button', { name: 'Enviar pago de prueba', exact: true })).toBeDisabled();
  await pay(page); await expect.poll(() => posts).toBe(1);
  await expect(page.getByRole('button', { name: 'Procesando pago…', exact: true })).toBeDisabled();
  await expect(page.getByRole('heading', { name: 'Pago confirmado por el servidor', exact: true })).toHaveCount(0);
  release(); await expect(page.getByRole('heading', { name: 'Pago confirmado por el servidor', exact: true })).toBeFocused();
  await expect(page.getByText('Estado del pedido: pagado', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enviar pago de prueba', exact: true })).toHaveCount(0);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(posts).toBe(1);
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 });
});

test('tok_declined muestra rechazo confirmado y no permite pagar reserva liberada', async ({ page }) => {
  let rejected = false;
  const result = { ...order, status: 'cancelado', reservation_state: 'liberada', payment: { id: 1, order_id: 7, amount: 89900, method: 'card', status: 'rechazado' } };
  await page.route('**/api/v1/orders/7', (route) => route.fulfill({ headers, json: rejected ? result : order }));
  await page.route('**/api/v1/orders/7/checkout', (route) => { expect(route.request().postDataJSON()).toEqual({ method: 'card', card_token: 'tok_declined' }); rejected = true; return route.fulfill({ headers, json: result }); });
  await openPayment(page); await pay(page, 'tok_declined');
  await expect(page.getByRole('heading', { name: 'Pago informado como rechazado', exact: true })).toBeFocused();
  await expect(page.getByText('Reserva: liberada', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enviar pago de prueba', exact: true })).toHaveCount(0);
});

test('respuesta perdida se consulta y no genera otro POST ni otro pedido', async ({ page }) => {
  let paid = false; let posts = 0;
  await page.route('**/api/v1/orders/7', (route) => route.fulfill({ headers, json: paid ? approved : order }));
  await page.route('**/api/v1/orders/7/checkout', async (route) => { posts++; paid = true; await route.abort(); });
  await openPayment(page); await pay(page);
  await expect(page.getByRole('alert')).toContainText('Consulta el resultado antes de intentar otro pago');
  await expect(page.getByRole('button', { name: 'Enviar pago de prueba', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Consultar resultado del pago', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Pago confirmado por el servidor', exact: true })).toBeVisible();
  expect(posts).toBe(1);
});

test('pago incierto todavía pendiente exige GET y nueva selección para reintentar el mismo ID', async ({ page }) => {
  let posts = 0;
  await page.route('**/api/v1/orders/7', (route) => route.fulfill({ headers, json: posts > 1 ? approved : order }));
  await page.route('**/api/v1/orders/7/checkout', async (route) => { posts++; if (posts === 1) await route.abort(); else await route.fulfill({ headers, json: approved }); });
  await openPayment(page); await pay(page);
  await expect(page.getByRole('alert')).toBeVisible(); expect(posts).toBe(1);
  await page.getByRole('button', { name: 'Consultar resultado del pago', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Enviar pago de prueba', exact: true })).toBeDisabled();
  await pay(page); await expect(page.getByRole('heading', { name: 'Pago confirmado por el servidor', exact: true })).toBeVisible(); expect(posts).toBe(2);
});

test('pedido pagado, expirado, reserva liberada y ajeno no habilitan pago', async ({ page }) => {
  let result: object = approved; let posts = 0;
  await page.route('**/api/v1/orders/7', (route) => route.fulfill({ headers, json: result }));
  await page.route('**/api/v1/orders/7/checkout', (route) => { posts++; return route.fulfill({ headers, json: approved }); });
  await openPayment(page); await expect(page.getByRole('heading', { name: 'Pago confirmado por el servidor', exact: true })).toBeVisible();
  for (const next of [{ ...order, status: 'expirado' }, { ...order, reservation_state: 'liberada' }, { ...order, user_id: 22 }]) {
    result = next; await page.getByRole('button', { name: 'Consultar resultado del pago', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Enviar pago de prueba', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Consultar resultado del pago', exact: true })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Enviar pago de prueba', exact: true })).toHaveCount(0);
  }
  expect(posts).toBe(0);
});

test('403 conserva sesión y 401 retira el pago privado', async ({ page }) => {
  let code = 403;
  await page.route('**/api/v1/orders/7', (route) => route.fulfill({ headers, json: order }));
  await page.route('**/api/v1/orders/7/checkout', (route) => route.fulfill({ headers, status: code, json: { detail: 'No autorizado' } }));
  await openPayment(page); await pay(page);
  await expect(page.getByRole('alert')).toContainText('No tienes permiso para pagar');
  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible(); code = 401;
  await page.getByRole('button', { name: 'Consultar resultado del pago', exact: true }).click(); await pay(page);
  await expect(page.getByRole('link', { name: 'Inicia sesión para consultar y pagar tu pedido', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Pedido #7', exact: true })).toHaveCount(0);
});

test('pago en curso sigue bloqueado al navegar y login recupera el destino', async ({ page }) => {
  let posts = 0; let paid = false; let release = () => {};
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/v1/orders/7', (route) => route.fulfill({ headers, json: paid ? approved : order }));
  await page.route('**/api/v1/orders/7/checkout', async (route) => { posts++; await gate; paid = true; await route.fulfill({ headers, json: approved }); });
  await openPayment(page); await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await page.getByRole('link', { name: 'Inicia sesión para consultar y pagar tu pedido', exact: true }).click();
  await page.getByLabel('Correo electrónico', { exact: true }).fill('cliente@example.com'); await page.getByLabel('Contraseña', { exact: true }).fill('prueba123');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL(/\/orders\/7\/payment\?source=api$/);
  await pay(page); await expect.poll(() => posts).toBe(1);
  await page.getByRole('link', { name: 'Ver detalle del pedido', exact: true }).click();
  await page.getByRole('link', { name: 'Pago de prueba y consulta del resultado', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Consultar resultado del pago', exact: true })).toBeDisabled();
  release(); await page.getByRole('button', { name: 'Consultar resultado del pago', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Pago confirmado por el servidor', exact: true })).toBeVisible(); expect(posts).toBe(1);
});

test('un POST aprobado no muestra confirmación si la consulta del pedido sigue pendiente', async ({ page }) => {
  let posts = 0;
  await page.route('**/api/v1/orders/7', (route) => route.fulfill({ headers, json: order }));
  await page.route('**/api/v1/orders/7/checkout', (route) => { posts++; return route.fulfill({ headers, json: approved }); });
  await openPayment(page); await pay(page);
  await expect(page.getByRole('button', { name: 'Enviar pago de prueba', exact: true })).toBeDisabled();
  await expect(page.getByText('Estado del pedido: pendiente_pago', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Pago confirmado por el servidor', exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Token de tarjeta de prueba', { exact: true })).toHaveValue('');
  expect(posts).toBe(1);
});


test('importe de pago inconsistente no se presenta como aprobado ni permite otro cobro', async ({ page }) => {
  let pending = false; let posts = 0;
  await page.route('**/api/v1/orders/7', (route) => route.fulfill({ headers, json: { ...approved, status: pending ? 'pendiente_pago' : 'pagado', reservation_state: 'activa', payment: { ...approved.payment, status: pending ? 'pendiente' : 'aprobado', amount: 1 } } }));
  await page.route('**/api/v1/orders/7/checkout', (route) => { posts++; return route.fulfill({ headers, json: approved }); });
  await openPayment(page);
  await expect(page.getByRole('alert')).toContainText('El importe del pago no coincide');
  await expect(page.getByRole('heading', { name: 'Pago confirmado por el servidor', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Enviar pago de prueba', exact: true })).toHaveCount(0);
  pending = true;
  await page.getByRole('button', { name: 'Consultar resultado del pago', exact: true }).click();
  await expect(page.getByText('Estado del pedido: pendiente_pago', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enviar pago de prueba', exact: true })).toHaveCount(0);
  expect(posts).toBe(0);
});
