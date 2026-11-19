import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { authCors } from './authFixtures.js';

const product = { id: 7, slug: 'vestido-real', name: 'Vestido del servidor', description: 'Descripción de API', price: 89900, currency: 'COP', category: 'Vestidos', sizes: ['M', 'L'], image: '/media/vestido.jpg', featured: true, quantity: 12, reserved: 3, available: 9, is_active: true };

test('catálogo público muestra fotos, COP y disponibilidad real sin mezclar carrito demo', async ({ page }) => {
  let details = 0;
  await page.route('**/api/v1/catalog', async (route) => {
    expect(route.request().headers().authorization).toBeUndefined();
    await route.fulfill({ headers: authCors, json: { items: [product, { ...product, id: 8, name: 'Inactivo', is_active: false }], count: 2 } });
  });
  await page.route('**/api/v1/products/7', async (route) => {
    details++;
    await route.fulfill({ headers: authCors, json: { ...product, stock_by_size: { M: 6, L: 0 } } });
  });
  await page.route('**/media/vestido.jpg', (route) => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="pink"/></svg>' }));
  await page.goto('/catalog?source=api');
  await expect(page.getByRole('link', { name: product.name, exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Inactivo', exact: true })).toHaveCount(0);
  await expect(page.getByText('$ 89.900,00', { exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: product.name })).toHaveAttribute('src', 'http://127.0.0.1:8000/media/vestido.jpg');
  await page.getByRole('searchbox', { name: 'Buscar productos' }).fill('No coincide');
  await expect(page.getByRole('status')).toContainText('No encontramos productos');
  await page.getByRole('button', { name: 'Limpiar búsqueda' }).click();
  await expect(page).toHaveURL(/source=api/);
  await page.getByRole('link', { name: product.name, exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: product.name })).toBeFocused();
  await expect(page.getByText('Talla M: 6 unidades disponibles', { exact: true })).toBeVisible();
  await expect(page.getByText('Talla L: Sin disponibilidad', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Agregar al carrito', exact: true })).toHaveCount(0);
  await expect(page.getByText('Foto del producto', { exact: true })).toBeVisible();
  expect(details).toBe(1);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('link', { name: 'Volver al catálogo', exact: true }).click();
  await expect(page).toHaveURL(/source=api/);
});

test('un fallo real ofrece reintento y un catálogo vacío no muestra productos demo', async ({ page }) => {
  let failing = true;
  await page.route('**/api/v1/catalog', (route) => route.fulfill({ headers: authCors, status: failing ? 503 : 200, json: failing ? { detail: 'Servicio temporalmente caído' } : { items: [], count: 0 } }));
  await page.goto('/catalog?source=api');
  await expect(page.getByRole('alert')).toContainText('Servicio temporalmente caído');
  failing = false;
  await page.getByRole('button', { name: 'Reintentar consulta' }).click();
  await expect(page.getByRole('status')).toContainText('No hay productos activos');
  await expect(page.getByRole('link', { name: 'Vestido midi estampado', exact: true })).toHaveCount(0);
});

test('detalle directo reconoce 404 y fotografía fallida tiene alternativa', async ({ page }) => {
  await page.route('**/api/v1/products/7', (route) => route.fulfill({ headers: authCors, json: { ...product, stock_by_size: {} } }));
  await page.route('**/media/vestido.jpg', (route) => route.abort());
  await page.goto('/catalog/7?source=api');
  await expect(page.getByRole('img', { name: 'Sin foto disponible' })).toBeVisible();
  await expect(page.getByText('No hay disponibilidad por talla registrada para este producto.', { exact: true })).toBeVisible();
  await page.route('**/api/v1/products/99', (route) => route.fulfill({ status: 404, headers: authCors, json: { detail: 'No existe' } }));
  await page.goto('/catalog/99?source=api');
  await expect(page.getByRole('heading', { name: 'Producto no disponible', exact: true })).toBeFocused();
  await expect(page.getByRole('alert')).toHaveCount(0);
});


test('permite cambiar de fuente sin sustituir un error de API por productos demo', async ({ page }) => {
  await page.route('**/api/v1/catalog', (route) => route.fulfill({ headers: authCors, status: 503, json: { detail: 'API fuera de servicio' } }));
  await page.goto('/catalog?source=api');
  await expect(page.getByRole('alert')).toContainText('API fuera de servicio');
  await page.getByRole('link', { name: 'Ver catálogo de demostración', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Vestido midi estampado', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Ver catálogo del servidor', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('API fuera de servicio');
  await expect(page.getByRole('link', { name: 'Vestido midi estampado', exact: true })).toHaveCount(0);
});
