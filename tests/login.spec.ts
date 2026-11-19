import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { authCors, mockProfile, testToken, testUser } from './authFixtures.js';

async function fillLogin(page: import('@playwright/test').Page) {
  await page.getByLabel('Correo electrónico', { exact: true }).fill(testUser.email);
  await page.getByLabel('Contraseña', { exact: true }).fill(' clave exacta ');
}

test('login usa OAuth2, consulta perfil y conserva sesión al navegar sin almacenar credenciales', async ({ page }, testInfo) => {
  const token = testToken();
  let calls = 0;
  let release = () => {};
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/v1/auth/login', async (route) => {
    calls++;
    expect(route.request().headers()['content-type']).toContain('application/x-www-form-urlencoded');
    expect(Object.fromEntries(new URLSearchParams(route.request().postData() ?? ''))).toEqual({ username: testUser.email, password: ' clave exacta ', grant_type: 'password' });
    await gate;
    await route.fulfill({ headers: authCors, json: { access_token: token, user: testUser } });
  });
  await mockProfile(page, token);
  await page.goto('/login');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page.getByLabel('Correo electrónico')).toBeFocused();
  await expect(page.getByLabel('Correo electrónico')).toHaveAccessibleDescription('Escribe un correo electrónico válido.');
  await fillLogin(page);
  const show = page.getByLabel('Mostrar contraseña', { exact: true });
  await show.focus(); await page.keyboard.press('Space');
  await expect(page.getByLabel('Contraseña', { exact: true })).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Iniciando sesión…', exact: true })).toBeDisabled();
  await expect.poll(() => calls).toBe(1);
  release();
  await expect(page.getByRole('status')).toContainText('Sesión iniciada como Cliente Prueba');
  await expect(page.getByLabel('Contraseña', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 });
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('sesion.png'), fullPage: true });
  await page.getByRole('link', { name: 'Volver al catálogo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Cerrar sesión', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Cerrar sesión', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page.getByLabel('Contraseña', { exact: true })).toHaveValue('');
});

test('401 y errores 422 no crean sesión y conservan errores accesibles', async ({ page }) => {
  let calls = 0;
  await page.route('**/api/v1/auth/login', async (route) => {
    calls++;
    await route.fulfill({ headers: authCors, status: calls === 1 ? 401 : 422, json: calls === 1 ? { detail: 'Credenciales incorrectas' } : { detail: [{ loc: ['body', 'username'], msg: 'Correo no válido', input: 'no mostrar' }] } });
  });
  await page.goto('/login');
  await fillLogin(page);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Credenciales incorrectas');
  await expect(page.getByRole('alert')).toBeFocused();
  await expect(page.getByLabel('Contraseña', { exact: true })).toHaveValue('');
  await page.getByLabel('Contraseña', { exact: true }).fill('clave');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page.getByLabel('Correo electrónico')).toBeFocused();
  await expect(page.getByLabel('Correo electrónico')).toHaveAccessibleDescription('Correo no válido');
  await expect(page.getByRole('button', { name: 'Cerrar sesión', exact: true })).toHaveCount(0);
});

test('un perfil rechazado impide completar la sesión', async ({ page }) => {
  const token = testToken();
  await page.route('**/api/v1/auth/login', (route) => route.fulfill({ headers: authCors, json: { access_token: token, user: testUser } }));
  await mockProfile(page, token, 401);
  await page.goto('/login');
  await fillLogin(page);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Token inválido o vencido');
  await expect(page.getByRole('button', { name: 'Cerrar sesión', exact: true })).toHaveCount(0);
});

test('la sesión vence según exp y recargar no restaura el token', async ({ page }) => {
  await page.clock.install();
  const token = testToken();
  await page.route('**/api/v1/auth/login', (route) => route.fulfill({ headers: authCors, json: { access_token: token, user: testUser } }));
  await mockProfile(page, token);
  await page.goto('/login');
  await fillLogin(page);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Sesión iniciada');
  await page.clock.fastForward(13 * 60 * 60 * 1000);
  await expect(page.getByText('Tu sesión venció. Vuelve a iniciar sesión.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cerrar sesión', exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel('Correo electrónico')).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Iniciar sesión', exact: true })).toBeVisible();
});
