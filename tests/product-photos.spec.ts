import { fileURLToPath } from 'node:url';
import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const dress = fileURLToPath(new URL('../public/images/products/vestido-midi-demo.png', import.meta.url));

test('catálogo muestra imágenes locales generadas; fallo de carga tiene alternativa', async ({ page }, testInfo) => {
  await page.goto('/catalog');
  const photo = page.getByRole('img', { name: 'Vestido midi verde con flores crema y tirantes finos' });
  await expect(photo).toBeVisible();
  await expect.poll(() => photo.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await page.screenshot({ path: testInfo.outputPath('catalogo-con-fotos.png'), fullPage: true });
  await page.getByRole('link', { name: 'Vestido midi estampado', exact: true }).click();
  await expect(photo).toBeVisible();
  await expect(page.getByText('Imagen ilustrativa generada con IA', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('detalle-con-foto.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations).toEqual([]);
  await page.route('**/images/products/vestido-midi-demo.png', (route) => route.abort());
  await page.reload();
  await expect(page.getByRole('img', { name: 'Sin foto disponible' })).toBeVisible();
});

test('foto local: valida archivo y descripción, conserva al editar y aparece en catálogo', async ({ page }) => {
  await page.goto('/admin/products');
  await page.getByRole('button', { name: 'Editar DEMO-VEST', exact: true }).click();
  const file = page.getByLabel('Foto del producto (opcional)');
  await file.setInputFiles({ name: 'incorrecto.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image') });
  await expect(file).toHaveAccessibleDescription(/Selecciona una foto JPG/);
  await file.setInputFiles({ name: 'corrupta.png', mimeType: 'image/png', buffer: Buffer.from('not an image') });
  await expect(file).toHaveAccessibleDescription(/no contiene una imagen/);
  await file.setInputFiles(dress);
  await expect(page.getByRole('status', { name: 'Lectura de foto' })).toBeEmpty();
  await page.getByLabel('Descripción de la foto').fill('');
  const save = page.getByRole('button', { name: 'Guardar cambios de demostración' });
  await save.click();
  await expect(page.getByLabel('Descripción de la foto')).toBeFocused();
  await expect(page.getByLabel('Descripción de la foto')).toHaveAccessibleDescription(/Describe la prenda/);
  await page.getByLabel('Descripción de la foto').fill('Vestido floral verde de demostración');
  await save.click();
  await expect(page.getByRole('status', { name: 'Registro de producto' })).toContainText('actualizado');
  await page.getByRole('button', { name: 'Editar DEMO-VEST', exact: true }).click();
  await expect(page.getByLabel('Descripción de la foto')).toHaveValue('Vestido floral verde de demostración');
  await page.getByRole('button', { name: 'Quitar foto o selección' }).click();
  await save.click();
  const card = page.getByRole('region', { name: 'Productos de esta sesión' }).getByRole('listitem').filter({ hasText: 'DEMO-VEST' });
  await expect(card.getByRole('img', { name: 'Sin foto disponible' })).toBeVisible();
  await page.getByRole('button', { name: 'Editar DEMO-VEST', exact: true }).click();
  await file.setInputFiles(dress);
  await expect(page.getByRole('status', { name: 'Lectura de foto' })).toBeEmpty();
  await page.getByLabel('Descripción de la foto').fill('Vestido floral verde de demostración');
  await save.click();
  await page.getByRole('link', { name: 'Ver catálogo', exact: true }).click();
  const photo = page.getByRole('img', { name: 'Vestido floral verde de demostración' });
  await expect(photo).toBeVisible();
  await expect(photo).toHaveAttribute('src', /^data:image\/png;base64,/);
  await page.getByRole('link', { name: 'Vestido midi estampado', exact: true }).click();
  await expect(photo).toBeVisible();
});
