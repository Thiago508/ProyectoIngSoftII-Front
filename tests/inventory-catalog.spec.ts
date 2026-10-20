import { expect, test, type Page } from '@playwright/test';

async function adjustDress(page: Page, quantity: string) {
  await page.getByLabel('Artículo a ajustar', { exact: true }).selectOption('DEMO-VEST-M');
  await page.getByLabel('Nueva cantidad existente', { exact: true }).fill(quantity);
  await page.getByLabel('Motivo del ajuste', { exact: true }).fill('Recuento de demostración');
  await page.getByRole('button', { name: 'Guardar ajuste de demostración', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Ajustar existencias', exact: true }).getByRole('status')).toContainText('Ajuste simulado guardado');
}

async function openDress(page: Page) {
  await page.getByRole('link', { name: 'Ver catálogo', exact: true }).click();
  await page.getByRole('link', { name: 'Vestido midi estampado', exact: true }).click();
}

test('ajustar inventario cambia la disponibilidad del catálogo y conserva historial al navegar', async ({ page }) => {
  await page.goto('/admin/inventory');
  await adjustDress(page, '6');
  await openDress(page);
  await expect(page.getByText('Talla M: 3 unidades disponibles', { exact: true })).toBeVisible();
  await page.getByLabel('Talla', { exact: true }).selectOption('DEMO-VEST-M');
  await page.getByLabel('Cantidad', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Agregar al carrito', exact: true }).click();
  await page.getByRole('link', { name: 'Administración (demostración)', exact: true }).click();
  await page.getByRole('link', { name: 'Inventario', exact: true }).click();
  const row = page.getByRole('row').filter({ has: page.getByRole('rowheader', { name: /DEMO-VEST-M/ }) });
  await expect(row.getByRole('cell').nth(1)).toHaveText('6');
  await expect(row.getByRole('cell').nth(2)).toHaveText('3');
  await expect(row.getByRole('cell').nth(3)).toHaveText('3');
  await expect(page.getByText('Cantidad anterior: 15 · Nueva cantidad: 6', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Todavía no hay ajustes registrados.', { exact: true })).toBeVisible();
});

test('checkout bloquea una selección que supera las unidades ajustadas y permite corregirla', async ({ page }) => {
  await page.goto('/catalog/demo-dress');
  await page.getByLabel('Talla', { exact: true }).selectOption('DEMO-VEST-M');
  await page.getByLabel('Cantidad', { exact: true }).fill('4');
  await page.getByRole('button', { name: 'Agregar al carrito', exact: true }).click();
  await page.getByRole('link', { name: 'Administración (demostración)', exact: true }).click();
  await page.getByRole('link', { name: 'Inventario', exact: true }).click();
  await adjustDress(page, '6');
  await page.getByRole('link', { name: 'Ver catálogo', exact: true }).click();
  await page.getByRole('link', { name: 'Carrito de compras: 4 unidades', exact: true }).click();
  await page.getByRole('link', { name: 'Continuar con la compra', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Revisa tu carrito', exact: true })).toBeFocused();
  await expect(page.getByRole('alert')).toContainText('disponibilidad suficiente');
  await page.getByRole('link', { name: 'Volver al carrito', exact: true }).click();
  await page.getByRole('textbox', { name: 'Cantidad de Vestido midi estampado, talla M', exact: true }).fill('3');
  await page.getByRole('button', { name: 'Guardar cantidad de Vestido midi estampado, talla M', exact: true }).click();
  await page.getByRole('link', { name: 'Continuar con la compra', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Datos personales', exact: true })).toBeFocused();
});

test('una talla agotada mediante ajuste ya no permite agregar productos desde catálogo', async ({ page }) => {
  await page.goto('/admin/inventory');
  await adjustDress(page, '3');
  await openDress(page);
  await expect(page.getByText('Talla M: Sin disponibilidad', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Agregar al carrito', exact: true })).toHaveCount(0);
});
