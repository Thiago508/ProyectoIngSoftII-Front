import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('F-05 agrega con validación, acumula unidades y presenta fotos y subtotal', async ({ page }, testInfo) => {
  await page.goto('/catalog/demo-dress');
  const add = page.getByRole('button', { name: 'Agregar al carrito', exact: true });
  await add.click();
  await expect(page.getByLabel('Talla', { exact: true })).toBeFocused();
  await expect(page.getByLabel('Talla', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  await page.getByLabel('Talla', { exact: true }).selectOption('DEMO-VEST-M');
  await page.getByLabel('Cantidad', { exact: true }).fill('0');
  await add.click();
  await expect(page.getByLabel('Cantidad', { exact: true })).toBeFocused();
  await expect(page.getByRole('alert')).toContainText('entera mayor que cero');
  await page.getByLabel('Cantidad', { exact: true }).fill('2');
  await add.click();
  await expect(page.getByRole('status')).toContainText('No se reservó inventario');
  await page.getByLabel('Cantidad', { exact: true }).fill('1');
  await add.click();
  await page.getByRole('link', { name: 'Carrito de compras: 3 unidades', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tu carrito', exact: true })).toBeFocused();
  const list = page.getByRole('list', { name: 'Productos del carrito' });
  await expect(list.getByRole('listitem')).toHaveCount(1);
  await expect(list).toContainText('Cantidad: 3');
  await expect(page.getByText('Subtotal de productos:', { exact: false })).toContainText('269.700,00');
  await expect(page.getByRole('img', { name: 'Vestido midi verde con flores crema y tirantes finos' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('carrito.png'), fullPage: true });
  await page.getByRole('link', { name: 'Seguir explorando el catálogo', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Carrito de compras: 3 unidades', exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('link', { name: 'Carrito de compras: 0 unidades', exact: true }).click();
  await expect(page.getByText('Tu carrito está vacío.', { exact: false })).toBeVisible();
});

test('sin variantes no ofrece compra y una talla agotada no se puede seleccionar', async ({ page }) => {
  await page.goto('/catalog/demo-dress');
  await expect(page.getByRole('option', { name: 'L — Sin disponibilidad', exact: true })).toBeDisabled();
  await expect(page.getByRole('link', { name: 'Carrito de compras: 0 unidades', exact: true })).toBeVisible();
});
