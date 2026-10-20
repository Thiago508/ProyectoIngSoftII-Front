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

test('SWR-07 valida, ajusta existencias y conserva historial local', async ({ page }) => {
  await page.goto('/admin/inventory');
  const quantity = page.getByLabel('Nueva cantidad existente');
  const reason = page.getByLabel('Motivo del ajuste');
  const save = page.getByRole('button', { name: 'Guardar ajuste de demostración' });
  await quantity.fill('2');
  await save.click();
  await expect(quantity).toBeFocused();
  await expect(quantity).toHaveAccessibleDescription(/inferior a las 3 unidades reservadas/);
  await expect(reason).toHaveAccessibleDescription('Indica el motivo del ajuste.');
  await expect(page.getByText('Todavía no hay ajustes registrados.')).toBeVisible();
  await quantity.fill('3.5');
  await save.click();
  await expect(quantity).toHaveAccessibleDescription(/entera mayor o igual a cero/);
  await quantity.fill('20');
  await reason.fill(' Conteo físico ');
  await save.click();
  await expect(page.getByRole('region', { name: 'Ajustar existencias' }).getByRole('status')).toContainText('15 → 20');
  const row = page.getByRole('row').filter({ hasText: 'DEMO-VEST-M' });
  await expect(row.getByRole('cell')).toHaveText(['M', '20', '3', '17', 'Disponible']);
  const history = page.getByRole('region', { name: 'Historial de ajustes de esta sesión' });
  await expect(history.getByRole('listitem')).toHaveCount(1);
  await expect(history).toContainText('Cantidad anterior: 15 · Nueva cantidad: 20');
  await expect(history).toContainText('Motivo: Conteo físico');
  await expect(history).toContainText('Usuario: Administrador de demostración');
  await expect(history.locator('time')).toHaveAttribute('datetime', /T/);
  await quantity.fill('3');
  await reason.fill('Corrección de conteo');
  await save.click();
  await expect(history.getByRole('listitem')).toHaveCount(2);
  await expect(history.getByRole('listitem').first()).toContainText('Cantidad anterior: 20 · Nueva cantidad: 3');
  await expect(row.getByRole('cell')).toHaveText(['M', '3', '3', '0', 'Sin disponibilidad']);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations).toEqual([]);
  await page.reload();
  await expect(page.getByText('Todavía no hay ajustes registrados.')).toBeVisible();
  await expect(row.getByRole('cell')).toHaveText(['M', '15', '3', '12', 'Disponible']);
});


test('SWR-08 reserva todo o nada, protege ajustes y no duplica un pedido', async ({ page }) => {
  await page.goto('/admin/inventory');
  const panel = page.getByRole('region', { name: 'Reservas de pedidos — laboratorio de demostración' });
  const blouse = page.getByRole('row').filter({ hasText: 'DEMO-BLUSA-S' });
  const dress = page.getByRole('row').filter({ hasText: 'DEMO-VEST-M' });
  await panel.getByRole('button', { name: 'Reservar DEMO-PED-002 (simulación)' }).click();
  await expect(panel.getByRole('alert')).toContainText('No se reservó ninguna línea');
  await expect(blouse.getByRole('cell')).toHaveText(['S', '25', '0', '25', 'Disponible']);
  await panel.getByRole('button', { name: 'Reservar DEMO-PED-001 (simulación)' }).click();
  await expect(panel.getByRole('status')).toContainText('se reservaron todas las líneas');
  await expect(dress.getByRole('cell')).toHaveText(['M', '15', '5', '10', 'Disponible']);
  await expect(blouse.getByRole('cell')).toHaveText(['S', '25', '1', '24', 'Disponible']);
  await panel.getByRole('button', { name: 'Reservar DEMO-PED-001 (simulación)' }).click();
  await expect(panel.getByRole('status')).toContainText('no se duplicaron unidades');
  await expect(dress.getByRole('cell')).toHaveText(['M', '15', '5', '10', 'Disponible']);
  await page.getByLabel('Nueva cantidad existente').fill('4');
  await page.getByLabel('Motivo del ajuste').fill('Conteo');
  await page.getByRole('button', { name: 'Guardar ajuste de demostración' }).click();
  await expect(page.getByLabel('Nueva cantidad existente')).toHaveAccessibleDescription(/5 unidades reservadas/);
  await page.getByLabel('Nueva cantidad existente').fill('20');
  await page.getByRole('button', { name: 'Guardar ajuste de demostración' }).click();
  await panel.getByRole('button', { name: 'Reservar DEMO-PED-001 (simulación)' }).click();
  await expect(panel.getByRole('status')).toContainText('no se duplicaron unidades');
  await expect(dress.getByRole('cell')).toHaveText(['M', '20', '5', '15', 'Disponible']);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations).toEqual([]);
});

for (const event of ['cancelación', 'expiración']) {
  test(`SWR-09 libera una sola vez por ${event} simulada`, async ({ page }) => {
    await page.goto('/admin/inventory');
    const panel = page.getByRole('region', { name: 'Reservas de pedidos — laboratorio de demostración' });
    const action = panel.getByRole('button', { name: `Simular ${event} DEMO-PED-001` });
    await action.click();
    await expect(panel.getByRole('alert')).toContainText('No hay una reserva registrada');
    await panel.getByRole('button', { name: 'Reservar DEMO-PED-001 (simulación)' }).click();
    const dress = page.getByRole('row').filter({ hasText: 'DEMO-VEST-M' });
    await expect(dress.getByRole('cell')).toHaveText(['M', '15', '5', '10', 'Disponible']);
    await action.click();
    await expect(panel.getByRole('status')).toContainText(`reserva liberada por ${event}`);
    await expect(dress.getByRole('cell')).toHaveText(['M', '15', '3', '12', 'Disponible']);
    await action.click();
    await expect(panel.getByRole('status')).toContainText('no se descontaron reservas otra vez');
    await panel.getByRole('button', { name: `Simular ${event === 'cancelación' ? 'expiración' : 'cancelación'} DEMO-PED-001` }).click();
    await expect(dress.getByRole('cell')).toHaveText(['M', '15', '3', '12', 'Disponible']);
    await panel.getByRole('button', { name: 'Reservar DEMO-PED-001 (simulación)' }).click();
    await expect(panel.getByRole('alert')).toContainText('No se crea una nueva reserva');
    await expect(dress.getByRole('cell')).toHaveText(['M', '15', '3', '12', 'Disponible']);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations).toEqual([]);
  });
}
