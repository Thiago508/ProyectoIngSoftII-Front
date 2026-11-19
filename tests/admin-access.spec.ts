import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { signInAs } from './adminFixtures.js';

const routes = ['/admin/products', '/admin/inventory', '/admin/notifications', '/admin/connection'];

test('las rutas administrativas y rutas desconocidas exigen sesión', async ({ page }) => {
  for (const path of [...routes, '/admin/desconocida']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Inicio de sesión', exact: true })).toBeFocused();
    await expect(page.getByText('Inicia sesión con una cuenta administrativa para continuar.')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Administración de demostración' })).toHaveCount(0);
  }
});

test('cliente y roles desconocidos no acceden ni muestran el enlace administrativo', async ({ page }) => {
  for (const role of ['cliente', 'otro']) {
    await signInAs(page, role);
    for (const path of routes) {
      // Navegación SPA conserva la sesión; no se simula persistencia al recargar.
      await page.evaluate((path) => { window.history.pushState({}, '', path); window.dispatchEvent(new PopStateEvent('popstate')); }, path);
      await expect(page.getByRole('heading', { name: 'Acceso denegado', exact: true })).toBeFocused();
      await expect(page.getByRole('link', { name: 'Administración (demostración)' })).toHaveCount(0);
      await expect(page.getByRole('navigation', { name: 'Administración de demostración' })).toHaveCount(0);
    }
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations).toEqual([]);
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  }
});

test('administrador vuelve al destino solicitado y pierde el acceso al salir o recargar', async ({ page }) => {
  await signInAs(page);
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await page.goto('/admin/inventory');
  await page.getByLabel('Correo electrónico', { exact: true }).fill('cliente@example.com');
  await page.getByLabel('Contraseña', { exact: true }).fill('prueba123');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/inventory$/);
  await expect(page.getByRole('heading', { name: 'Inventario', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('navigation', { name: 'Administración de demostración' })).toHaveCount(0);
  await page.getByLabel('Correo electrónico', { exact: true }).fill('cliente@example.com');
  await page.getByLabel('Contraseña', { exact: true }).fill('prueba123');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/inventory$/);
  await page.reload();
  await expect(page).toHaveURL(/\/login$/);
});

test('vencer dentro de administración retira la pantalla protegida', async ({ page }) => {
  await page.clock.install();
  await signInAs(page);
  await page.getByRole('link', { name: 'Administración (demostración)' }).click();
  await expect(page).toHaveURL(/\/admin\/products$/);
  await page.clock.fastForward(13 * 60 * 60 * 1000);
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText('Tu sesión venció. Vuelve a iniciar sesión.', { exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Administración de demostración' })).toHaveCount(0);
});
