import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// La fecha de los avisos debe permanecer en Colombia aunque cambie la zona del navegador.
test.use({ timezoneId: 'Asia/Tokyo' });

test('F-08 muestra pedido, estado y fecha de cada ejemplo; admite una bandeja vacía accesible', async ({ page }, testInfo) => {
  await page.goto('/catalog');
  await page.getByRole('link', { name: 'Notificaciones (demostración)', exact: true }).click();
  await expect(page).toHaveURL(/\/notifications$/);
  await expect(page.getByRole('heading', { name: 'Notificaciones', exact: true })).toBeFocused();
  await expect(page).toHaveTitle('Notificaciones | Fashion Online Store');
  await page.getByLabel('Escenario de notificaciones (demostración)').selectOption('examples');
  const list = page.getByRole('list', { name: 'Notificaciones de pedidos de demostración' });
  const items = list.getByRole('listitem');
  await expect(items).toHaveCount(4);
  const states = ['Enviado', 'Cancelado', 'Pagado', 'Registrado'];
  for (const [index, state] of states.entries()) {
    await expect(items.nth(index)).toContainText('Identificador del pedido');
    await expect(items.nth(index)).toContainText(/DEMO-100[12]/);
    await expect(items.nth(index)).toContainText(state);
    await expect(items.nth(index).locator('time')).toHaveAttribute('datetime', /2026-10-\d{2}T\d{2}:00:00-05:00/);
  }
  await expect(items.first().locator('time')).toContainText('11:00');
  await expect(page.getByRole('status')).toContainText('4 notificaciones de demostración');
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('notificaciones.png'), fullPage: true });
  const scenario = page.getByLabel('Escenario de notificaciones (demostración)');
  await scenario.focus();
  await page.keyboard.press('ArrowDown');
  await expect(scenario).toHaveValue('empty');
  await expect(scenario).toBeFocused();
  await expect(list).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('No hay notificaciones');
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations).toEqual([]);
  await scenario.selectOption('examples');
  await expect(items).toHaveCount(4);
});

test('la bandeja no altera el carrito y recargar vuelve a la sesión vacía', async ({ page }) => {
  await page.goto('/catalog/demo-dress');
  await page.getByLabel('Talla', { exact: true }).selectOption('DEMO-VEST-M');
  await page.getByRole('button', { name: 'Agregar al carrito', exact: true }).click();
  await page.getByRole('link', { name: 'Notificaciones (demostración)', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Carrito de compras: 1 unidades', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Volver al catálogo', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Carrito de compras: 1 unidades', exact: true })).toBeVisible();
  await page.goto('/notifications');
  await page.getByLabel('Escenario de notificaciones (demostración)').selectOption('empty');
  await page.reload();
  await expect(page.getByLabel('Escenario de notificaciones (demostración)')).toHaveValue('session');
  await expect(page.getByRole('listitem')).toHaveCount(0);
});

async function reachOrderSummary(page: import('@playwright/test').Page) {
  await page.goto('/checkout?demo=1');
  await page.getByLabel('Nombre completo').fill('Karen Martínez');
  await page.getByLabel('Correo electrónico').fill('karen@example.com');
  await page.getByLabel('Teléfono').fill('3001234567');
  await page.getByLabel('Dirección', { exact: true }).fill('Calle 14 # 23 - 45');
  await page.getByLabel('Ciudad').fill('Armenia');
  await page.getByLabel('Departamento').fill('Quindío');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
}

test('un error de creación no genera un aviso de registro', async ({ page }) => {
  await reachOrderSummary(page);
  await page.getByLabel('Simular error de creación').check();
  await page.getByRole('button', { name: 'Crear pedido de demostración', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('No se pudo crear');
  await page.getByRole('link', { name: 'Notificaciones (demostración)', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('No hay notificaciones');
  await expect(page.getByRole('listitem')).toHaveCount(0);
});

test('crear tras un reintento genera un único aviso; la vista de pago aprobado no genera otro', async ({ page }) => {
  await reachOrderSummary(page);
  const submit = page.getByRole('button', { name: 'Crear pedido de demostración', exact: true });
  await page.getByLabel('Simular error de creación').check();
  await submit.click();
  await expect(page.getByRole('alert')).toContainText('No se pudo crear');
  await page.getByLabel('Simular error de creación').uncheck();
  await submit.click();
  await expect(page.getByRole('heading', { name: 'Pedido de demostración creado' })).toBeVisible();
  const orderId = (await page.getByText(/^Referencia: DEMO-/).innerText()).replace('Referencia: ', '');
  const createdAt = await page.locator('time').getAttribute('datetime');
  await page.getByRole('link', { name: 'Seleccionar método de pago (demostración)' }).click();
  await page.getByRole('link', { name: 'Ver resultados de pago (demostración)' }).click();
  await page.getByLabel('Resultado a visualizar (demostración)').selectOption('approved');
  await page.getByRole('link', { name: 'Notificaciones (demostración)', exact: true }).click();
  const notices = page.getByRole('listitem');
  await expect(notices).toHaveCount(1);
  await expect(notices).toContainText(orderId);
  await expect(notices).toContainText('Registrado');
  await expect(notices.locator('time')).toHaveAttribute('datetime', createdAt!);
  await page.getByLabel('Escenario de notificaciones (demostración)').selectOption('empty');
  await expect(notices).toHaveCount(0);
  await page.getByLabel('Escenario de notificaciones (demostración)').selectOption('session');
  await expect(notices).toHaveCount(1);
  await page.getByRole('link', { name: 'Volver al catálogo', exact: true }).click();
  await page.getByRole('link', { name: 'Notificaciones (demostración)', exact: true }).click();
  await expect(notices).toHaveCount(1);
  await page.reload();
  await expect(notices).toHaveCount(0);
});
