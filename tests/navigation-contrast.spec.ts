import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('el enlace de compra conserva contraste normal y hover; administración es accesible desde carrito', async ({ page }, testInfo) => {
  await page.goto('/catalog/demo-dress');
  await page.getByLabel('Talla', { exact: true }).selectOption('DEMO-VEST-M');
  await page.getByRole('button', { name: 'Agregar al carrito', exact: true }).click();
  await page.getByRole('link', { name: 'Carrito de compras: 1 unidades', exact: true }).click();
  const checkout = page.getByRole('link', { name: 'Continuar con la compra', exact: true });
  await expect(checkout).toBeVisible();
  await expect(checkout).toHaveCSS('color', 'rgb(255, 255, 255)');
  await expect(checkout).toHaveCSS('background-color', 'rgb(181, 45, 89)');
  const audit = async () => {
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  };
  await audit();
  if (testInfo.project.name !== 'mobile') {
    await checkout.hover();
    await expect(checkout).toHaveCSS('color', 'rgb(255, 255, 255)');
    await expect(checkout).toHaveCSS('background-color', 'rgb(155, 36, 75)');
    await audit();
  }
  await page.screenshot({ path: testInfo.outputPath('carrito-contraste.png'), fullPage: true });
  await checkout.click();
  await expect(page.getByRole('heading', { name: 'Datos personales', exact: true })).toBeFocused();
  const admin = page.getByRole('link', { name: 'Administración (demostración)', exact: true });
  await admin.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/admin\/products$/);
  await page.getByRole('link', { name: 'Inventario', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/inventory$/);
  await page.getByRole('link', { name: 'Ver catálogo', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Carrito de compras: 1 unidades', exact: true })).toBeVisible();
});
