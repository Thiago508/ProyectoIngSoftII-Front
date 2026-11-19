import { createHmac } from 'node:crypto';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const api = process.env.FASHION_INTEGRATION_API!;
const front = process.env.FASHION_INTEGRATION_FRONT!;
const runId = process.env.FASHION_INTEGRATION_RUN!;
const adminEmail = process.env.FASHION_INTEGRATION_ADMIN_EMAIL!;
const adminPassword = process.env.FASHION_INTEGRATION_ADMIN_PASSWORD!;
const email = 'cliente.integration@example.com';
const password = 'Integration-client-2026!';
const name = 'Cliente de integración';
let adminToken = '';
let clientToken = '';
let productId = 0;
let approvedOrderId = 0;
let approvedTotal = 0;
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
async function loginToken(request: APIRequestContext, email: string, password: string) {
  const response = await request.post(`${api}/auth/login`, { form: { username: email, password } });
  expect(response.status()).toBe(200);
  const body = await response.json() as { access_token: string; user: { role: string } };
  expect(typeof body.access_token).toBe('string');
  for (const key of ['password', 'password_hash', 'hashed_password']) expect(Object.keys(body.user)).not.toContain(key);
  return body.access_token;
}
async function loginUi(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico', { exact: true }).fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Sesión iniciada');
}
async function inventory(request: APIRequestContext) {
  const response = await request.get(`${api}/inventory/${productId}`, { headers: auth(adminToken) });
  expect(response.status()).toBe(200);
  const body = await response.json() as { sizes: { size: string; quantity: number; reserved: number; available: number }[] };
  const row = body.sizes.find((item) => item.size === 'M');
  expect(row).toBeDefined();
  return row!;
}
async function createFromCart(page: Page) {
  await page.getByRole('link', { name: 'Continuar con la compra', exact: true }).click();
  await page.getByLabel('Revisé los productos, tallas y cantidades.', { exact: true }).check();
  const responsePromise = page.waitForResponse((response) => response.url() === `${api}/orders` && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Crear pedido pendiente de pago', exact: true }).click();
  const response = await responsePromise; expect(response.status()).toBe(201);
  const result = await response.json() as { id: number; total: number; status: string };
  await expect(page.getByRole('heading', { name: 'Pedido recibido', exact: true })).toBeVisible();
  expect(result.status).toBe('pendiente_pago'); return result;
}

test.describe.configure({ mode: 'serial' });
test.beforeAll(async ({ request }) => {
  const health = await request.get(`${api}/health`);
  expect(health.status()).toBe(200);
  expect(health.headers()['x-fashion-integration-run']).toBe(runId);
  adminToken = await loginToken(request, adminEmail, adminPassword);
});
test.beforeEach(async ({ context }) => {
  // Guardia de red, sin respuestas inventadas: API y frontend continúan a sus servidores reales.
  await context.route('**/*', async (route) => {
    const origin = new URL(route.request().url()).origin;
    if (origin !== new URL(front).origin && origin !== new URL(api).origin) { await route.abort('blockedbyclient'); return; }
    await route.continue();
  });
});

test('administrador crea un producto y asigna existencias por talla desde la UI', async ({ page, request }) => {
  await loginUi(page, adminEmail, adminPassword);
  await page.getByRole('link', { name: 'Administración', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Crear producto', exact: true })).toBeEnabled();
  await page.getByLabel('Slug del producto', { exact: true }).fill('prenda-integracion');
  await page.getByLabel('SKU del producto (opcional)', { exact: true }).fill('INTEGRATION-01');
  await page.getByLabel('Nombre del producto', { exact: true }).fill('Prenda de integración');
  await page.getByLabel('Descripción del producto', { exact: true }).fill('Prenda creada exclusivamente en la base temporal.');
  await page.getByLabel('Precio en COP', { exact: true }).fill('89900');
  await page.getByLabel('Categoría', { exact: true }).fill('Vestidos');
  await page.getByLabel('Tallas separadas por comas', { exact: true }).fill('M');
  const created = page.waitForResponse((response) => response.url() === `${api}/products` && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Crear producto', exact: true }).click();
  const response = await created; expect(response.status()).toBe(201);
  productId = (await response.json() as { id: number }).id;
  await expect(page.getByRole('heading', { level: 3, name: 'Prenda de integración', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Inventario', exact: true }).click();
  await page.getByLabel('Producto', { exact: true }).selectOption(String(productId));
  await page.getByLabel('Talla', { exact: true }).fill('M');
  await page.getByLabel('Cantidad física nueva', { exact: true }).fill('10');
  await page.getByLabel('Motivo del ajuste', { exact: true }).fill('Preparación de prueba aislada');
  await page.getByRole('button', { name: 'Guardar ajuste', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Ajuste confirmado');
  expect(await inventory(request)).toMatchObject({ quantity: 10, reserved: 0, available: 10 });
});

test('cliente registra cuenta, compra, paga y recibe avisos con efectos únicos', async ({ page, request }) => {
  await page.goto('/register');
  await page.getByLabel('Nombre completo', { exact: true }).fill(name);
  await page.getByLabel('Correo electrónico', { exact: true }).fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByLabel('Confirmar contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Cuenta creada. Sesión iniciada');
  await expect(page.getByRole('link', { name: 'Administración', exact: true })).toHaveCount(0);
  clientToken = await loginToken(request, email, password);
  await page.getByRole('link', { name: 'Volver al catálogo', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Buscar productos' }).fill('integración');
  await page.getByRole('link', { name: 'Prenda de integración', exact: true }).click();
  await page.getByLabel('Talla', { exact: true }).selectOption('M');
  await page.getByLabel('Cantidad', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Agregar al carrito', exact: true }).click();
  await page.getByRole('link', { name: 'Carrito de compras: 2 unidades', exact: true }).click();
  await page.getByLabel('Cantidad de Prenda de integración, talla M', { exact: true }).fill('3');
  await page.getByRole('button', { name: 'Guardar cantidad de Prenda de integración, talla M', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Carrito de compras: 3 unidades', exact: true })).toBeVisible();
  expect(await inventory(request)).toMatchObject({ quantity: 10, reserved: 0, available: 10 });
  await page.getByLabel('Cantidad de Prenda de integración, talla M', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Guardar cantidad de Prenda de integración, talla M', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Carrito de compras: 2 unidades', exact: true })).toBeVisible();
  const created = await createFromCart(page); approvedOrderId = created.id; approvedTotal = created.total;
  expect(await inventory(request)).toMatchObject({ quantity: 10, reserved: 2, available: 8 });
  await page.getByRole('link', { name: 'Continuar al pago de prueba', exact: true }).click();
  await page.getByLabel('Token de tarjeta de prueba', { exact: true }).selectOption('tok_ok');
  await page.getByRole('button', { name: 'Enviar pago de prueba', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Pago confirmado por el servidor', exact: true })).toBeVisible();
  expect(await inventory(request)).toMatchObject({ quantity: 8, reserved: 0, available: 8 });
  const repeated = await request.post(`${api}/orders/${created.id}/checkout`, { headers: auth(clientToken), data: { method: 'card', card_token: 'tok_ok' } });
  expect(repeated.status()).toBe(200);
  expect(await inventory(request)).toMatchObject({ quantity: 8, reserved: 0, available: 8 });
  await page.getByRole('link', { name: 'Notificaciones', exact: true }).click();
  await expect(page.getByRole('list', { name: 'Notificaciones de tu cuenta' })).toBeVisible();
  const noticeResponse = await request.get(`${api}/notifications`, { headers: auth(clientToken) });
  const notices = await noticeResponse.json() as { id: number; order_id: number; event: string; is_read: boolean }[];
  expect(notices.filter((notice) => notice.order_id === created.id && notice.event === 'order_registered')).toHaveLength(1);
  expect(notices.filter((notice) => notice.order_id === created.id && notice.event === 'payment_approved')).toHaveLength(1);
  const first = notices[0];
  await page.getByRole('button', { name: `Marcar notificación ${first.id} como leída`, exact: true }).click();
  await expect(page.getByRole('status')).toContainText('confirmada por el servidor');
  const other = await request.post(`${api}/auth/register`, { data: { name: 'Otra cuenta aislada', email: 'otra.integration@example.com', password } });
  expect(other.status()).toBe(201); const otherToken = (await other.json() as { access_token: string }).access_token;
  expect((await request.get(`${api}/orders/${created.id}`, { headers: auth(otherToken) })).status()).toBe(404);
  expect((await request.post(`${api}/notifications/${first.id}/read`, { headers: auth(otherToken) })).status()).toBe(404);
  expect((await request.get(`${api}/notifications/attempts`, { headers: auth(clientToken) })).status()).toBe(403);
  expect((await request.post(`${api}/inventory/adjustments`, { headers: auth(clientToken), data: { product_id: productId, size: 'M', new_quantity: 8, reason: 'No permitido' } })).status()).toBe(403);
  expect((await request.get(`${api}/cart`, { headers: auth('invalid-token') })).status()).toBe(401);
  const past = `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: '2', role: 'cliente', exp: 1 })).toString('base64url')}`;
  const signature = createHmac('sha256', process.env.FASHION_INTEGRATION_JWT_SECRET!).update(past).digest('base64url');
  expect((await request.get(`${api}/cart`, { headers: auth(`${past}.${signature}`) })).status()).toBe(401);
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 });
});

test('pago rechazado libera reserva sin descontar el físico ni liberar dos veces', async ({ page, request }) => {
  await loginUi(page, email, password);
  await page.getByRole('link', { name: 'Volver al catálogo', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Buscar productos' }).fill('integración');
  await page.getByRole('link', { name: 'Prenda de integración', exact: true }).click();
  await page.getByLabel('Talla', { exact: true }).selectOption('M');
  await page.getByRole('button', { name: 'Agregar al carrito', exact: true }).click();
  await page.getByRole('link', { name: /^Carrito de compras:/ }).click();
  await page.getByLabel('Cantidad de Prenda de integración, talla M', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'Guardar cantidad de Prenda de integración, talla M', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Carrito de compras: 1 unidades', exact: true })).toBeVisible();
  const created = await createFromCart(page);
  expect(await inventory(request)).toMatchObject({ quantity: 8, reserved: 1, available: 7 });
  await page.getByRole('link', { name: 'Continuar al pago de prueba', exact: true }).click();
  await page.getByLabel('Token de tarjeta de prueba', { exact: true }).selectOption('tok_declined');
  await page.getByRole('button', { name: 'Enviar pago de prueba', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Pago informado como rechazado', exact: true })).toBeVisible();
  expect(await inventory(request)).toMatchObject({ quantity: 8, reserved: 0, available: 8 });
  expect((await request.post(`${api}/orders/${created.id}/checkout`, { headers: auth(clientToken), data: { method: 'card', card_token: 'tok_declined' } })).status()).toBe(409);
  expect(await inventory(request)).toMatchObject({ quantity: 8, reserved: 0, available: 8 });
});

test('administrador consulta intentos persistentes y su deduplicación', async ({ page }) => {
  await loginUi(page, adminEmail, adminPassword);
  await page.getByRole('link', { name: 'Administración', exact: true }).click();
  await page.getByRole('link', { name: 'Notificaciones', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Intentos de notificación', exact: true })).toBeVisible();
  await page.getByLabel('Filtrar por resultado', { exact: true }).selectOption('deduplicated');
  await expect(page.getByRole('listitem')).toHaveCount(1);
  await expect(page.getByRole('list', { name: 'Intentos registrados por el servidor', exact: true }).getByText('deduplicated', { exact: true })).toBeVisible();
});

test('webhook firmado debe aceptar la moneda COP acordada con frontend', async ({ request }) => {
  expect(approvedOrderId).toBeGreaterThan(0); expect(approvedTotal).toBeGreaterThan(0);
  const created = await request.post(`${api}/orders`, { headers: auth(clientToken), data: { items: [{ product_id: productId, size: 'M', quantity: 1 }] } });
  expect(created.status()).toBe(201);
  const pendingOrder = await created.json() as { id: number; total: number };
  const payload = JSON.stringify({ event_id: 'isolated-cop-contract-check', order_id: pendingOrder.id, result: 'approved', amount: pendingOrder.total, currency: 'COP' });
  expect((await request.post(`${api}/webhooks/psp`, { headers: { 'Content-Type': 'application/json' }, data: payload })).status()).toBe(401);
  const signature = createHmac('sha256', process.env.FASHION_INTEGRATION_PSP_SECRET!).update(payload).digest('hex');
  const response = await request.post(`${api}/webhooks/psp`, { headers: { 'Content-Type': 'application/json', 'X-PSP-Signature': signature }, data: payload });
  const rejection = await response.json() as { detail?: { code?: string } };
  await test.info().attach('currency-contract', { body: JSON.stringify({ currency: 'COP', status: response.status(), code: rejection.detail?.code ?? null }), contentType: 'application/json' });
  expect(response.status(), `COP firmado con importe correcto: HTTP ${response.status()}, código ${rejection.detail?.code ?? 'sin código'}`).toBe(200);
});
