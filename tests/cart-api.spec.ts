import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { signInAs } from './adminFixtures.js';
import { authCors } from './authFixtures.js';

const product = { id: 7, slug: 'vestido', name: 'Vestido API', description: 'Floral', price: 89900, currency: 'COP', sizes: ['M', 'L'], image: '', is_active: true, stock_by_size: { M: 10, L: 5 } };
const line = (size: string, quantity: number) => ({ product_id: 7, name: 'Vestido API', size, quantity, unit_price: 89900, line_subtotal: 89900 * quantity, is_active: true });
const cart = (items: ReturnType<typeof line>[]) => ({ items, subtotal: items.reduce((sum, item) => sum + item.line_subtotal, 0), currency: 'COP' });
const headers = { ...authCors, 'Access-Control-Allow-Headers': 'authorization,content-type', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS' };
async function navigate(page: Page, path: string) {
  await page.evaluate((path) => { history.pushState({}, '', path); dispatchEvent(new PopStateEvent('popstate')); }, path);
}
async function mockProduct(page: Page) {
  await page.route('**/api/v1/products/7', (route) => route.fulfill({ headers, json: product }));
}

test('agrega, actualiza y retira por talla usando el carrito confirmado por servidor', async ({ page }) => {
  await mockProduct(page);
  let items = [line('L', 1)];
  let posts = 0;
  let puts = 0;
  let release = () => {};
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/v1/cart**', async (route) => {
    const request = route.request();
    const method = request.method();
    if (method === 'OPTIONS') { await route.fulfill({ headers, body: '' }); return; }
    expect(request.headers().authorization).toMatch(/^Bearer /);
    if (method === 'POST') {
      posts++;
      expect(request.postDataJSON()).toEqual({ product_id: 7, quantity: 2, size: 'M' });
      await gate;
      items = [line('M', 2), line('L', 1)];
    }
    if (method === 'PUT') {
      puts++;
      expect(request.postDataJSON()).toEqual({ quantity: 3, size: 'M' });
      items = [line('M', 3), line('L', 1)];
    }
    if (method === 'DELETE') {
      const size = new URL(request.url()).searchParams.get('size');
      expect(new URL(request.url()).pathname).toBe('/api/v1/cart/7');
      items = items.filter((item) => item.size !== size);
    }
    await route.fulfill({ headers, json: cart(items) });
  });
  await signInAs(page, 'cliente');
  await navigate(page, '/catalog/7?source=api');
  await expect(page.getByRole('link', { name: 'Carrito de compras: consultar', exact: true })).toBeVisible();
  await page.getByLabel('Talla', { exact: true }).selectOption('M');
  await page.getByLabel('Cantidad', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Agregar al carrito', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Actualizando carrito…', exact: true })).toBeDisabled();
  await expect.poll(() => posts).toBe(1);
  release();
  await expect(page.getByRole('status')).toContainText('Carrito actualizado por el servidor');
  await page.getByRole('link', { name: 'Carrito de compras: 3 unidades', exact: true }).click();
  await expect(page.getByRole('listitem')).toHaveCount(2);
  const quantity = page.getByLabel('Cantidad de Vestido API, talla M', { exact: true });
  await quantity.fill('0');
  await page.getByRole('button', { name: 'Guardar cantidad de Vestido API, talla M', exact: true }).click();
  await expect(quantity).toBeFocused();
  expect(puts).toBe(0);
  await quantity.fill('3');
  await page.getByRole('button', { name: 'Guardar cantidad de Vestido API, talla M', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Carrito de compras: 4 unidades', exact: true })).toBeVisible();
  await expect(page.getByText('Subtotal de productos: $ 359.600,00', { exact: true })).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Retirar Vestido API, talla M', exact: true }).click();
  await expect(page.getByRole('listitem')).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 2, name: 'Vestido API', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Retirar Vestido API, talla L', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Tu carrito', exact: true })).toBeFocused();
  await expect(page.getByText('Tu carrito está vacío. Explora el catálogo para agregar productos.', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Continuar con la compra', exact: true })).toHaveCount(0);
});

test('un alta incierta exige consultar y no repite el POST automáticamente', async ({ page }) => {
  await mockProduct(page);
  let posts = 0;
  await page.route('**/api/v1/cart**', async (route) => {
    if (route.request().method() === 'POST') { posts++; await route.abort(); return; }
    await route.fulfill({ headers, json: cart([line('M', 1)]) });
  });
  await signInAs(page, 'cliente');
  await navigate(page, '/catalog/7?source=api');
  await page.getByLabel('Talla', { exact: true }).selectOption('M');
  await page.getByRole('button', { name: 'Agregar al carrito', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Consulta el carrito antes de repetir');
  await expect(page.getByRole('button', { name: 'Agregar al carrito', exact: true })).toHaveCount(0);
  expect(posts).toBe(1);
  await page.getByRole('button', { name: 'Consultar carrito antes de continuar', exact: true }).click();
  await page.getByRole('link', { name: 'Carrito de compras: 1 unidades', exact: true }).click();
  await expect(page.getByRole('listitem')).toHaveCount(1);
  expect(posts).toBe(1);
});

test('401 invalida sesión y 403 conserva la cuenta sin mostrar datos del carrito', async ({ page }) => {
  let status = 403;
  await page.route('**/api/v1/cart**', (route) => route.fulfill({ headers, status, json: { detail: 'Acceso rechazado' } }));
  await signInAs(page, 'cliente');
  await navigate(page, '/cart?source=api');
  await expect(page.getByRole('alert')).toHaveText('No tienes permiso para realizar esta operación.');
  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
  status = 401;
  await page.getByRole('button', { name: 'Consultar carrito', exact: true }).click();
  await expect(page.getByText('Tu sesión venció. Vuelve a iniciar sesión.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toHaveCount(0);
  await expect(page.getByRole('listitem')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Inicia sesión para consultar tu carrito', exact: true })).toBeVisible();
});

test('login vuelve al carrito y cerrar sesión elimina sus datos visibles', async ({ page }) => {
  await page.route('**/api/v1/cart**', (route) => route.fulfill({ headers, json: cart([line('M', 2)]) }));
  await signInAs(page, 'cliente');
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await navigate(page, '/cart?source=api');
  await page.getByRole('link', { name: 'Inicia sesión para consultar tu carrito', exact: true }).click();
  await page.getByLabel('Correo electrónico', { exact: true }).fill('cliente@example.com');
  await page.getByLabel('Contraseña', { exact: true }).fill('prueba123');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL(/\/cart\?source=api$/);
  await expect(page.getByRole('listitem')).toHaveCount(1);
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page.getByRole('listitem')).toHaveCount(0);
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 });
});

test('una respuesta pendiente de la cuenta anterior no aparece en una nueva sesión', async ({ page }) => {
  let reads = 0;
  let release = () => {};
  let delivered = false;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/v1/cart**', async (route) => {
    if (route.request().method() === 'OPTIONS') { await route.fulfill({ headers, body: '' }); return; }
    if (++reads === 1) {
      await gate;
      await route.fulfill({ headers, json: cart([line('M', 2)]) });
      delivered = true;
    } else await route.fulfill({ headers, json: cart([]) });
  });
  await signInAs(page, 'cliente');
  await navigate(page, '/cart?source=api');
  await expect.poll(() => reads).toBe(1);
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  const nextUser = { id: 22, name: 'Otra cuenta', email: 'otra@example.com', role: 'cliente' };
  const nextToken = `${Buffer.from('{"alg":"HS256"}').toString('base64url')}.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 43200 })).toString('base64url')}.otra-firma`;
  await page.route('**/api/v1/auth/login', (route) => route.fulfill({ headers, json: { access_token: nextToken, user: nextUser } }));
  await page.route('**/api/v1/users/me', (route) => route.fulfill({ headers, json: nextUser }));
  await page.getByRole('link', { name: 'Inicia sesión para consultar tu carrito', exact: true }).click();
  await page.getByLabel('Correo electrónico', { exact: true }).fill(nextUser.email);
  await page.getByLabel('Contraseña', { exact: true }).fill('prueba123');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page.getByText('Tu carrito está vacío. Explora el catálogo para agregar productos.', { exact: true })).toBeVisible();
  release();
  await expect.poll(() => delivered).toBe(true);
  await expect(page.getByRole('listitem')).toHaveCount(0);
  await expect(page.getByText('Sesión: Otra cuenta', { exact: true })).toBeVisible();
});

test('un artículo inactivo solo permite retirarlo', async ({ page }) => {
  let removed = false;
  await page.route('**/api/v1/cart**', async (route) => {
    if (route.request().method() === 'DELETE') removed = true;
    await route.fulfill({ headers, json: removed ? cart([]) : cart([{ ...line('M', 1), is_active: false }]) });
  });
  await signInAs(page, 'cliente');
  await navigate(page, '/cart?source=api');
  await expect(page.getByRole('button', { name: 'Guardar cantidad de Vestido API, talla M', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Retirar Vestido API, talla M', exact: true }).click();
  await expect(page.getByRole('listitem')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Tu carrito', exact: true })).toBeFocused();
});
