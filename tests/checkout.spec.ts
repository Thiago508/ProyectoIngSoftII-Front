import { expect, test, type Page } from '@playwright/test';

async function fillData(page: Page) {
  await page.getByLabel('Nombre completo').fill(' Karen Martínez ');
  await page.getByLabel('Correo electrónico').fill('karen@example.com');
  await page.getByLabel('Teléfono').fill('300 123 4567');
  await page.getByLabel('Dirección', { exact: true }).fill('Calle 14 # 23 - 45');
  await page.getByLabel('Ciudad').fill('Armenia');
  await page.getByLabel('Departamento').fill('Quindío');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
}

async function reachSummary(page: Page) {
  await page.goto('/checkout');
  await fillData(page);
}

test('errores propios, foco y conservación del borrador entre rutas', async ({ page }) => {
  await page.goto('/checkout');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByLabel('Nombre completo')).toBeFocused();
  await expect(page.getByText('Escribe un correo electrónico válido.')).toBeVisible();
  await fillData(page);
  await expect(page).toHaveURL(/\/checkout\/summary$/);
  await expect(page.getByRole('button', { name: 'Crear pedido de demostración', exact: true })).toBeEnabled();
  await expect(page.getByRole('radio')).toHaveCount(0);
  await page.getByRole('link', { name: 'Editar datos y envío' }).click();
  await expect(page.getByLabel('Nombre completo')).toHaveValue('Karen Martínez');
  await expect(page.getByLabel('Teléfono')).toHaveValue('3001234567');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page).toHaveURL(/\/checkout\/summary$/);
});

test('acceso directo y recarga de una etapa requieren datos previos', async ({ page }) => {
  for (const path of ['/checkout/payment', '/checkout/summary', '/checkout/unknown']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/checkout$/);
  }
  await reachSummary(page);
  await page.reload();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByLabel('Nombre completo')).toHaveValue('');
});

test('error, reintento y pedido pendiente de pago con protección del historial', async ({ page }) => {
  await reachSummary(page);
  await page.getByLabel('Simular error de creación').check();
  await page.getByRole('button', { name: 'Crear pedido de demostración', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('No se pudo crear');
  await page.getByLabel('Simular error de creación').uncheck();
  await page.getByRole('button', { name: 'Crear pedido de demostración', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Creando pedido de demostración…' })).toBeDisabled();
  await page.goBack();
  await expect(page).toHaveURL(/\/checkout\/summary$/);
  await expect(page.getByRole('heading', { name: 'Pedido de demostración creado' })).toBeFocused();
  await expect(page.getByText('Estado: pendiente de pago.')).toBeVisible();
  await expect(page.getByText(/Referencia: DEMO-/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Crear pedido de demostración', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Fashion Online Store' }).click();
  await expect(page).toHaveURL(/\/checkout\/summary$/);
});

test('salto de teclado y ausencia de desbordamiento horizontal', async ({ page }, testInfo) => {
  await page.goto('/checkout');
  await page.screenshot({ path: testInfo.outputPath('datos.png'), fullPage: true });
  await page.getByRole('link', { name: 'Saltar al contenido del checkout' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Datos personales' })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await reachSummary(page);
  await page.screenshot({ path: testInfo.outputPath('resumen.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});


test('selección de pago disponible después de crear y sin alterar el estado pendiente', async ({ page }) => {
  await reachSummary(page);
  await expect(page.getByRole('link', { name: 'Seleccionar método de pago (demostración)' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Crear pedido de demostración', exact: true }).click();
  await page.getByRole('link', { name: 'Seleccionar método de pago (demostración)' }).click();
  await page.getByRole('button', { name: 'Guardar selección de demostración' }).click();
  await expect(page.getByRole('radio').first()).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('radio', { name: 'Nequi / Daviplata' })).toBeChecked();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Nequi / Daviplata', { exact: true })).toBeVisible();
  await expect(page.getByText('Estado: pendiente de pago.')).toBeVisible();
  await page.getByRole('link', { name: 'Seleccionar método de pago (demostración)' }).click();
  await expect(page.getByRole('radio', { name: 'Nequi / Daviplata' })).toBeChecked();
});
