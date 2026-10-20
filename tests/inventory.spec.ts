import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('SWR-06 muestra cantidades por talla y calcula disponibilidad', async ({ page }, testInfo) => {
  await page.goto('/admin/inventory');
  await expect(page.getByRole('heading', { name: 'Inventario', exact: true })).toBeFocused();
  await expect(page).toHaveTitle('Inventario | Fashion Online Store');
  await expect(page.getByText(/El acceso de administrador todavía no está protegido/)).toBeVisible();
  const rows = page.getByRole('table').getByRole('row');
  await expect(rows).toHaveCount(5);
  const dressM = page.getByRole('row').filter({ hasText: 'DEMO-VEST-M' });
  await expect(dressM.getByRole('cell')).toHaveText(['M', '15', '3', '12', 'Disponible']);
  const reserved = page.getByRole('row').filter({ hasText: 'DEMO-VEST-L' });
  await expect(reserved.getByRole('cell')).toHaveText(['L', '8', '8', '0', 'Sin disponibilidad']);
  const empty = page.getByRole('row').filter({ hasText: 'DEMO-FALDA-M' });
  await expect(empty.getByRole('cell')).toHaveText(['M', '0', '0', '0', 'Sin disponibilidad']);
  const region = page.getByRole('region', { name: 'Cantidades de inventario por artículo' });
  await region.focus();
  await expect(region).toBeFocused();
  if (testInfo.project.name === 'mobile') {
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => region.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(audit.violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('inventario.png'), fullPage: true });
  await page.getByRole('link', { name: 'Ir al checkout de demostración' }).click();
  await expect(page).toHaveURL(/\/checkout$/);
});
