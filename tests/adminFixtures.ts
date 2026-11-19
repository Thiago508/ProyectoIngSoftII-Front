import { expect, test as base, type Page } from '@playwright/test';
import { authCors, testToken, testUser } from './authFixtures.js';

export async function signInAs(page: Page, role = 'administrador') {
  const user = { ...testUser, role };
  const token = testToken();
  await page.route('**/api/v1/auth/login', (route) => route.fulfill({ headers: authCors, json: { access_token: token, token_type: 'bearer', user } }));
  await page.route('**/api/v1/users/me', (route) => route.fulfill({ headers: { ...authCors, 'Access-Control-Allow-Headers': 'authorization', 'Access-Control-Allow-Methods': 'GET' }, json: user }));
  await page.goto('/login');
  await page.evaluate(() => { window.history.replaceState({}, '', '/login'); window.dispatchEvent(new PopStateEvent('popstate')); });
  await page.getByLabel('Correo electrónico', { exact: true }).fill(user.email);
  await page.getByLabel('Contraseña', { exact: true }).fill('prueba123');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Sesión iniciada');
}

export async function visitAsAdmin(page: Page, path: string) {
  await signInAs(page);
  const target = new URL(path, page.url());
  await page.evaluate((path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, target.pathname + target.search + target.hash);
}

export async function reloadAsAdmin(page: Page) {
  const url = page.url();
  await page.reload();
  await visitAsAdmin(page, url);
}

// Las pruebas de negocio obtienen sesión por formulario; no se inyecta estado en producción.
export const test = base;
