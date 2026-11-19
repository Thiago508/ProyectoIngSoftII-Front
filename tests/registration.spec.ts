import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { authCors, mockProfile, testToken, testUser } from './authFixtures.js';

async function fillRegistration(page: import('@playwright/test').Page) {
  await page.getByLabel('Nombre completo').fill(` ${testUser.name} `);
  await page.getByLabel('Correo electrónico').fill(testUser.email);
  await page.getByLabel('Contraseña', { exact: true }).fill(' clave exacta ');
  await page.getByLabel('Confirmar contraseña', { exact: true }).fill(' clave exacta ');
}

test('registro envía solo UserCreate y abre una sesión verificada sin seleccionar rol', async ({ page }, testInfo) => {
  const token = testToken();
  let calls = 0;
  await page.route('**/api/v1/auth/register', async (route) => {
    if (route.request().method() === 'OPTIONS') { await route.fulfill({ headers: { ...authCors, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'content-type' }, body: '' }); return; }
    calls++;
    expect(route.request().postDataJSON()).toEqual({ name: testUser.name, email: testUser.email, password: ' clave exacta ' });
    await route.fulfill({ status: 201, headers: authCors, json: { access_token: token, token_type: 'bearer', user: testUser } });
  });
  await mockProfile(page, token);
  await page.goto('/catalog');
  await page.getByRole('link', { name: 'Registro de cliente', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Registro de cliente', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await expect(page.getByLabel('Nombre completo')).toBeFocused();
  expect(calls).toBe(0);
  await fillRegistration(page);
  await page.getByLabel('Confirmar contraseña', { exact: true }).fill('distinta');
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await expect(page.getByLabel('Confirmar contraseña', { exact: true })).toBeFocused();
  await expect(page.getByLabel('Confirmar contraseña', { exact: true })).toHaveAccessibleDescription('Las contraseñas no coinciden.');
  await page.getByLabel('Confirmar contraseña', { exact: true }).fill(' clave exacta ');
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Cuenta creada. Sesión iniciada');
  expect(calls).toBe(1);
  await expect(page.getByLabel('Contraseña', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 });
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('registro-api.png'), fullPage: true });
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await expect(page.getByLabel('Nombre completo')).toHaveValue('');
  await expect(page.getByLabel('Contraseña', { exact: true })).toHaveValue('');
});

test('un correo duplicado muestra el error sin registrar ni iniciar sesión automáticamente', async ({ page }) => {
  await page.route('**/api/v1/auth/register', (route) => route.fulfill({ status: 409, headers: authCors, json: { detail: { code: 'EMAIL_EXISTS', message: 'El correo ya está registrado' } } }));
  await page.goto('/register');
  await fillRegistration(page);
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('El correo ya está registrado');
  await expect(page.getByLabel('Contraseña', { exact: true })).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Crear cuenta', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Cerrar sesión', exact: true })).toHaveCount(0);
});

test('registro aceptado y perfil fallido dirige al acceso sin repetir el alta', async ({ page }) => {
  const token = testToken();
  let calls = 0;
  await page.route('**/api/v1/auth/register', (route) => {
    if (route.request().method() !== 'OPTIONS') calls++;
    return route.fulfill({ status: 201, headers: authCors, json: { access_token: token, user: testUser } });
  });
  await mockProfile(page, token, 401);
  await page.goto('/register');
  await fillRegistration(page);
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('El servidor aceptó el registro');
  await expect(page.getByRole('button', { name: 'Crear cuenta', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Cerrar sesión', exact: true })).toHaveCount(0);
  expect(calls).toBe(1);
  await page.getByRole('link', { name: 'Ir al inicio de sesión', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test('navegar entre acceso y registro no conserva contraseñas ni pierde el carrito', async ({ page }) => {
  await page.goto('/catalog/demo-dress');
  await page.getByLabel('Talla', { exact: true }).selectOption('DEMO-VEST-M');
  await page.getByRole('button', { name: 'Agregar al carrito', exact: true }).click();
  await page.getByRole('link', { name: 'Registro de cliente', exact: true }).click();
  await page.getByLabel('Nombre completo').fill('Borrador');
  await page.getByRole('link', { name: 'Ir al inicio de sesión', exact: true }).click();
  await page.getByLabel('Contraseña', { exact: true }).fill('No persistir');
  await page.getByRole('link', { name: 'Ir al registro', exact: true }).click();
  await expect(page.getByLabel('Nombre completo')).toHaveValue('');
  await page.getByRole('link', { name: 'Ir al inicio de sesión', exact: true }).click();
  await expect(page.getByLabel('Contraseña', { exact: true })).toHaveValue('');
  await page.getByRole('link', { name: 'Volver al catálogo', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Carrito de compras: 1 unidades', exact: true })).toBeVisible();
});
