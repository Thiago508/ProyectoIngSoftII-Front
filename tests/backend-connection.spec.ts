import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const health = 'http://127.0.0.1:8000/api/v1/health';
const cors = { 'Access-Control-Allow-Origin': '*' };

test('la comprobación consulta la URL configurada, anuncia espera y muestra respuesta o error recuperable', async ({ page }, testInfo) => {
  let calls = 0;
  let release = () => {};
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route(health, async (route) => {
    calls++;
    expect(route.request().method()).toBe('GET');
    expect(route.request().headers().authorization).toBeUndefined();
    if (calls === 1) await gate;
    if (calls === 2) await route.fulfill({ status: 503, headers: cors, json: { detail: 'Servicio temporalmente no disponible' } });
    else await route.fulfill({ headers: cors, json: { status: 'ok' } });
  });
  await page.goto('/admin/products');
  await page.getByRole('link', { name: 'Conexión API', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Conexión con backend', exact: true })).toBeFocused();
  expect(calls).toBe(0);
  const button = page.getByRole('button', { name: 'Comprobar conexión', exact: true });
  await button.click();
  await expect(button).toBeDisabled();
  await expect(page.getByRole('status')).toContainText('Consultando el estado del backend');
  await expect.poll(() => calls).toBe(1);
  release();
  await expect(page.getByRole('status')).toContainText('El servidor respondió');
  await expect(page.locator('dd')).toHaveText('ok');
  await expect(button).toBeEnabled();
  await button.click();
  await expect(page.getByRole('alert')).toHaveText('Servicio temporalmente no disponible');
  await expect(page.locator('dd')).toHaveCount(0);
  await button.click();
  await expect(page.getByRole('status')).toContainText('El servidor respondió');
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('conexion-api.png'), fullPage: true });
});

test('una respuesta incompatible y un fallo de red se muestran sin anunciar conexión válida', async ({ page }) => {
  let calls = 0;
  await page.route(health, async (route) => {
    calls++;
    if (calls === 1) await route.fulfill({ headers: cors, json: { status: 123 } });
    else await route.abort('failed');
  });
  await page.goto('/admin/connection');
  const button = page.getByRole('button', { name: 'Comprobar conexión', exact: true });
  await button.click();
  await expect(page.getByRole('alert')).toContainText('formato distinto al documentado');
  await expect(page.getByRole('status')).toBeEmpty();
  await button.click();
  await expect(page.getByRole('alert')).toContainText('No se pudo conectar con el backend');
  await expect(page.getByRole('status')).toBeEmpty();
  await expect(button).toBeEnabled();
  await page.getByRole('link', { name: 'Productos', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/products$/);
});
