import { expect, test } from '@playwright/test';

test('editar el carrito conserva datos y envío, actualiza el resumen y limpia el borrador al crear', async ({ page }) => {
  await page.goto('/catalog/demo-dress');
  await page.getByLabel('Talla', { exact: true }).selectOption('DEMO-VEST-M');
  await page.getByRole('button', { name: 'Agregar al carrito', exact: true }).click();
  await page.getByRole('link', { name: 'Carrito de compras: 1 unidades', exact: true }).click();
  await page.getByRole('link', { name: 'Continuar con la compra' }).click();
  await page.getByLabel('Nombre completo').fill('Karen Martínez');
  await page.getByLabel('Correo electrónico').fill('karen@example.com');
  await page.getByLabel('Teléfono').fill('3001234567');
  await page.getByLabel('Dirección', { exact: true }).fill('Calle 14 # 23 - 45');
  await page.getByLabel('Ciudad').fill('Armenia');
  await page.getByLabel('Departamento').fill('Quindío');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('link', { name: 'Editar carrito', exact: true }).click();
  await page.getByRole('textbox', { name: 'Cantidad de Vestido midi estampado, talla M', exact: true }).fill('2');
  await page.getByRole('button', { name: 'Guardar cantidad de Vestido midi estampado, talla M', exact: true }).click();
  await page.getByRole('link', { name: 'Continuar con la compra' }).click();
  await expect(page.getByRole('heading', { name: 'Datos personales', exact: true })).toBeFocused();
  await expect(page.getByLabel('Nombre completo')).toHaveValue('Karen Martínez');
  await expect(page.getByLabel('Correo electrónico')).toHaveValue('karen@example.com');
  await expect(page.getByLabel('Teléfono')).toHaveValue('3001234567');
  await expect(page.getByLabel('Dirección', { exact: true })).toHaveValue('Calle 14 # 23 - 45');
  await expect(page.getByLabel('Ciudad')).toHaveValue('Armenia');
  await expect(page.getByLabel('Departamento')).toHaveValue('Quindío');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByText('Talla: M · Cantidad: 2', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Datos de envío' })).toContainText('karen@example.com');
  await page.getByLabel('Simular error de creación').check();
  await page.getByRole('button', { name: 'Crear pedido de demostración', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('No se pudo crear');
  await page.getByRole('link', { name: 'Editar datos y envío', exact: true }).click();
  await expect(page.getByLabel('Nombre completo')).toHaveValue('Karen Martínez');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  // El control de error visual se reinicia al desmontar el resumen.
  await page.getByRole('button', { name: 'Crear pedido de demostración', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Pedido de demostración creado' })).toBeVisible();
  await page.getByRole('link', { name: 'Ver detalle del pedido', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Datos y envío' })).toContainText('karen@example.com');
  await page.getByRole('link', { name: 'Carrito de compras: 2 unidades', exact: true }).click();
  await page.getByRole('link', { name: 'Continuar con la compra' }).click();
  for (const label of ['Nombre completo', 'Correo electrónico', 'Teléfono', 'Dirección', 'Ciudad', 'Departamento']) {
    await expect(page.getByLabel(label, { exact: true })).toHaveValue('');
  }
});

test('el borrador parcial sobrevive a navegar por la SPA, sin persistir tras recargar', async ({ page }) => {
  await page.goto('/checkout?demo=1');
  await page.getByLabel('Nombre completo').fill('Borrador parcial');
  await page.getByRole('link', { name: 'Notificaciones (demostración)', exact: true }).click();
  await page.goBack();
  await expect(page.getByLabel('Nombre completo')).toHaveValue('Borrador parcial');
  await expect(page.getByLabel('Correo electrónico')).toHaveValue('');
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 });
  await page.reload();
  await expect(page.getByLabel('Nombre completo')).toHaveValue('');
});
