import { expect, test } from '@playwright/test';

test('datos largos y texto ampliado conservan el flujo sin desbordamiento', async ({ page }, testInfo) => {
  test.setTimeout(60000);
  if (testInfo.project.name === 'mobile') await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/checkout');
  if (testInfo.project.name !== 'mobile') {
    await page.addStyleTag({ content: 'html { font-size: 200%; }' });
  }
  const customerName = 'María Alejandra Fernández de los Ríos';
  const email = 'maria.alejandra.fernandez.delosrios@example.com';
  const address = 'Carrera 123 número 45 - 67, conjunto residencial Los Almendros, torre 12, apartamento 1504';
  await page.getByLabel('Nombre completo').fill(customerName);
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Teléfono').fill('3001234567');
  await page.getByLabel('Dirección', { exact: true }).fill(address);
  await page.getByLabel('Ciudad').fill('San José de la Montaña');
  await page.getByLabel('Departamento').fill('Antioquia');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Revisa tu pedido' })).toBeFocused();
  await expect(page.getByText(email, { exact: false })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('resumen-datos-largos.png'), fullPage: true });
  await page.getByRole('link', { name: 'Editar datos y envío' }).click();
  await expect(page.getByLabel('Nombre completo')).toHaveValue(customerName);
  await expect(page.getByLabel('Correo electrónico')).toHaveValue(email);
  await expect(page.getByLabel('Dirección', { exact: true })).toHaveValue(address);
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Crear pedido de demostración', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Pedido de demostración creado' })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('resultado-datos-largos.png'), fullPage: true });
  await page.getByRole('link', { name: 'Seleccionar método de pago (demostración)' }).click();
  await expect(page.getByRole('heading', { name: 'Pago', exact: true })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('pago-texto-ampliado.png'), fullPage: true });
  await page.getByRole('radio', { name: 'Pago en efectivo (contra entrega)' }).check();
  await page.getByRole('button', { name: 'Guardar selección de demostración' }).click();
  await expect(page.getByText('Estado: pendiente de pago.')).toBeVisible();
});
