import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('SWR-35 presenta resultados y distingue fallos por intento sin duplicar avisos lógicos', async ({ page }, testInfo) => {
  await page.goto('/admin/products');
  await page.getByRole('link', { name: 'Notificaciones', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/notifications$/);
  await expect(page.getByRole('link', { name: 'Notificaciones', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('heading', { name: 'Procesamiento de notificaciones', exact: true })).toBeFocused();
  const list = page.getByRole('list', { name: 'Resultados de procesamiento de demostración' });
  await expect(list.locator(':scope > li')).toHaveCount(4);
  const filter = page.getByLabel('Filtrar por resultado de procesamiento', { exact: true });
  await filter.selectOption('failed');
  await expect(page.getByRole('status')).toHaveText('1 registro de demostración.');
  await expect(list.locator(':scope > li')).toHaveCount(1);
  const failed = list.locator(':scope > li');
  await expect(failed).toContainText('DEMO-1002');
  await expect(failed).toContainText('Cancelado');
  const summary = page.getByText('Ver intentos de notice-demo-3', { exact: true });
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Intento 1: Fallido', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Intento 2: Fallido', exact: true })).toBeVisible();
  await expect(failed.locator('time').first()).toHaveAttribute('datetime', '2026-10-20T10:00:00-05:00');
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('procesamiento-fallido.png'), fullPage: true });
  await filter.selectOption('processed');
  await expect(page.getByRole('status')).toHaveText('2 registros de demostración.');
  await page.getByText('Ver intentos de notice-demo-2', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Intento 1: Fallido', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Intento 2: Procesado', exact: true })).toBeVisible();
  await expect(list.locator(':scope > li')).toHaveCount(2);
  await filter.selectOption('pending');
  await expect(page.getByText('No hay intentos registrados en este ejemplo pendiente.', { exact: true })).toBeVisible();
});

test('el acceso directo ofrece salto al contenido y no genera avisos de sesión', async ({ page }) => {
  await page.goto('/admin/notifications');
  await page.getByRole('link', { name: 'Saltar al procesamiento de notificaciones', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Procesamiento de notificaciones', exact: true })).toBeFocused();
  await page.getByLabel('Filtrar por resultado de procesamiento', { exact: true }).selectOption('failed');
  await page.reload();
  await expect(page.getByLabel('Filtrar por resultado de procesamiento', { exact: true })).toHaveValue('all');
  await page.getByRole('link', { name: 'Ver catálogo', exact: true }).click();
  await page.getByRole('link', { name: 'Notificaciones (demostración)', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('No hay notificaciones');
});
