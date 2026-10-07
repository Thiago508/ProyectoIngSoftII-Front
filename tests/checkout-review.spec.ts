import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page, type TestInfo } from '@playwright/test';

async function audit(page: Page, testInfo: TestInfo, state: string) {
  await page.screenshot({ path: testInfo.outputPath(`${state}.png`), fullPage: true });
  await testInfo.attach(`${state}-accessible-tree`, { body: await page.locator('main').ariaSnapshot(), contentType: 'text/plain' });
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  await testInfo.attach(`${state}-axe`, { body: JSON.stringify(results, null, 2), contentType: 'application/json' });
  expect(results.violations.map((violation) => ({ id: violation.id, nodes: violation.nodes.map((node) => node.target) }))).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

test('revisión visual y accesible de datos, pago, errores y resultado', async ({ page }, testInfo) => {
  await page.goto('/checkout');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByLabel('Correo electrónico')).toHaveAccessibleDescription('Escribe un correo electrónico válido.');
  await audit(page, testInfo, 'datos-errores');
  await page.getByLabel('Nombre completo').fill('Karen Martínez');
  await page.getByLabel('Correo electrónico').fill('karen@example.com');
  await page.getByLabel('Teléfono').fill('3001234567');
  await page.getByLabel('Dirección', { exact: true }).fill('Calle 14 # 23 - 45');
  await page.getByLabel('Ciudad').fill('Armenia');
  await page.getByLabel('Departamento').fill('Quindío');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await audit(page, testInfo, 'pago');
  await page.getByRole('button', { name: 'Revisar borrador' }).click();
  await expect(page.getByRole('radio').first()).toBeFocused();
  await expect(page.getByRole('radio').first()).toHaveAccessibleDescription('Selecciona un método de pago.');
  await audit(page, testInfo, 'pago-error');
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('radio', { name: 'Nequi / Daviplata' })).toBeChecked();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Revisar borrador' })).toBeFocused();
  await page.keyboard.press('Enter');
  await audit(page, testInfo, 'resumen');
  await page.getByLabel('Simular error de creación').check();
  await page.getByRole('button', { name: 'Crear pedido de demostración', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Creando pedido');
  await expect(page.getByRole('alert')).toContainText('No se pudo crear');
  await audit(page, testInfo, 'creacion-error');
  await page.getByLabel('Simular error de creación').uncheck();
  await page.getByRole('button', { name: 'Crear pedido de demostración', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Pedido de demostración creado' })).toBeFocused();
  await expect(page.getByRole('status')).toContainText('pendiente de pago');
  await audit(page, testInfo, 'resultado');
});
