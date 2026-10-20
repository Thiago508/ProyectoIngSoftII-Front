import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('un producto nuevo puede comprarse tras registrar su talla y ajustar existencias', async ({ page }, testInfo) => {
  test.setTimeout(60_000); // Recorre producto, inventario, catálogo y checkout.
  await page.goto('/admin/products');
  await page.getByLabel('Identificador comercial', { exact: true }).fill('LINO');
  await page.getByLabel('Nombre del producto', { exact: true }).fill('Blusa lino nueva');
  await page.getByLabel('Descripción del producto', { exact: true }).fill('Blusa de lino de demostración');
  await page.getByLabel('Precio en COP', { exact: true }).fill('79900');
  await page.getByRole('button', { name: 'Registrar producto de demostración', exact: true }).click();
  await page.getByRole('link', { name: 'Inventario', exact: true }).click();
  const form = page.getByRole('region', { name: 'Registrar talla / SKU', exact: true });
  await form.getByLabel('Producto de la talla', { exact: true }).selectOption({ label: 'Blusa lino nueva · LINO' });
  await form.getByLabel('SKU de la talla', { exact: true }).fill(' lino-m ');
  await form.getByLabel('Talla del artículo', { exact: true }).fill(' m ');
  await form.getByRole('button', { name: 'Registrar talla de demostración', exact: true }).click();
  await expect(form.getByRole('status')).toContainText('SKU LINO-M. Existente: 0; reservado: 0');
  const row = page.getByRole('table').getByRole('row').filter({ hasText: 'LINO-M' });
  await expect(row.getByRole('cell')).toHaveText(['M', '0', '0', '0', 'Sin disponibilidad']);
  await expect(page.getByText('Todavía no hay ajustes registrados.', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Ver catálogo', exact: true }).click();
  await page.getByRole('link', { name: 'Blusa lino nueva', exact: true }).click();
  await expect(page.getByText('Talla M: Sin disponibilidad', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Agregar al carrito', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Administración (demostración)', exact: true }).click();
  await page.getByRole('link', { name: 'Inventario', exact: true }).click();
  await page.getByLabel('Artículo a ajustar', { exact: true }).selectOption('LINO-M');
  await page.getByLabel('Nueva cantidad existente', { exact: true }).fill('5');
  await page.getByLabel('Motivo del ajuste', { exact: true }).fill('Ingreso de cinco unidades');
  await page.getByRole('button', { name: 'Guardar ajuste de demostración', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Historial de ajustes de esta sesión' })).toContainText('Cantidad anterior: 0 · Nueva cantidad: 5');
  await page.getByRole('link', { name: 'Ver catálogo', exact: true }).click();
  await page.getByRole('link', { name: 'Blusa lino nueva', exact: true }).click();
  await expect(page.getByText('Talla M: 5 unidades disponibles', { exact: true })).toBeVisible();
  await page.getByLabel('Talla', { exact: true }).selectOption('LINO-M');
  await page.getByLabel('Cantidad', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Agregar al carrito', exact: true }).click();
  await page.getByRole('link', { name: 'Carrito de compras: 2 unidades', exact: true }).click();
  await expect(page.getByText('Subtotal de productos:', { exact: false })).toContainText('159.800');
  await page.getByRole('link', { name: 'Continuar con la compra', exact: true }).click();
  for (const [label, value] of [
    ['Nombre completo', 'Karen Martínez'], ['Correo electrónico', 'karen@example.com'],
    ['Teléfono', '3001234567'], ['Dirección', 'Calle 14 # 23 - 45'],
    ['Ciudad', 'Armenia'], ['Departamento', 'Quindío'],
  ]) await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByText('Talla: M · Cantidad: 2', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Crear pedido de demostración', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Pedido de demostración creado', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Administración (demostración)', exact: true }).click();
  await page.getByRole('link', { name: 'Inventario', exact: true }).click();
  await expect(row.getByRole('cell')).toHaveText(['M', '5', '0', '5', 'Disponible']);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('talla-nueva.png'), fullPage: true });
});

test('valida errores y conserva la asociación de talla tras editar el código comercial', async ({ page }) => {
  await page.goto('/admin/inventory');
  const form = page.getByRole('region', { name: 'Registrar talla / SKU', exact: true });
  const submit = form.getByRole('button', { name: 'Registrar talla de demostración', exact: true });
  const product = form.getByLabel('Producto de la talla', { exact: true });
  const sku = form.getByLabel('SKU de la talla', { exact: true });
  const size = form.getByLabel('Talla del artículo', { exact: true });
  await submit.click();
  await expect(product).toBeFocused();
  await expect(product).toHaveAccessibleDescription('Selecciona un producto activo.');
  await product.selectOption('demo-dress');
  await sku.fill(' demo-blusa-s ');
  await size.fill('M');
  await submit.click();
  await expect(sku).toBeFocused();
  await expect(sku).toHaveAccessibleDescription('Ya existe un artículo con este SKU.');
  await sku.fill('VEST-XL');
  await submit.click();
  await expect(size).toBeFocused();
  await expect(size).toHaveAccessibleDescription(/Este producto ya tiene un artículo para esa talla/);
  await size.fill('XL');
  await submit.click();
  await expect(form.getByRole('status')).toContainText('SKU VEST-XL');
  await page.getByRole('link', { name: 'Productos', exact: true }).click();
  await page.getByRole('button', { name: 'Editar DEMO-VEST', exact: true }).click();
  await page.getByLabel('Identificador comercial', { exact: true }).fill('VEST-ACTUAL');
  await page.getByRole('button', { name: 'Guardar cambios de demostración', exact: true }).click();
  await page.getByRole('link', { name: 'Ver catálogo', exact: true }).click();
  await page.getByRole('link', { name: 'Vestido midi estampado', exact: true }).click();
  await expect(page.getByText('Talla XL: Sin disponibilidad', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Talla XL: Sin disponibilidad', { exact: true })).toHaveCount(0);
});
