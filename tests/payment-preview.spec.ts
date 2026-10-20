import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('F-06 muestra los tres resultados sin aplicar un pago al pedido', async ({ page }) => {
  await page.goto('/checkout?demo=1');
  await page.getByLabel('Nombre completo').fill('Karen Martínez');
  await page.getByLabel('Correo electrónico').fill('karen@example.com');
  await page.getByLabel('Teléfono').fill('3001234567');
  await page.getByLabel('Dirección', { exact: true }).fill('Calle 14 # 23 - 45');
  await page.getByLabel('Ciudad').fill('Armenia');
  await page.getByLabel('Departamento').fill('Quindío');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Crear pedido de demostración', exact: true }).click();
  const reference = await page.getByText(/^Referencia: DEMO-/).textContent();
  await page.getByRole('link', { name: 'Seleccionar método de pago (demostración)' }).click();

  const preview = page.getByRole('region', { name: 'Vista previa del resultado de pago' });
  const scenario = preview.getByLabel('Resultado a visualizar (demostración)');
  await expect(preview.getByRole('status')).toContainText('Pago pendiente (simulación)');
  await scenario.focus();
  await page.keyboard.press('ArrowDown');
  await expect(scenario).toHaveValue('approved');
  await expect(scenario).toBeFocused();
  await expect(preview.getByRole('status')).toContainText('Pago aprobado (simulación)');
  await expect(preview).toContainText('continúa pendiente de pago');
  await expect(preview).toContainText('219.700');
  await expect(preview).toContainText('Moneda: COP');
  await scenario.selectOption('rejected');
  await expect(preview.getByRole('status')).toContainText('Pago rechazado (simulación)');
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('link', { name: 'Volver al pedido', exact: true }).click();
  await expect(page.getByText('Estado: pendiente de pago.', { exact: false })).toBeVisible();
  await expect(page.getByText(reference!, { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Seleccionar método de pago (demostración)' }).click();
  await expect(page.getByLabel('Resultado a visualizar (demostración)')).toHaveValue('pending');
});
