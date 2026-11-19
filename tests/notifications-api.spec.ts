import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { signInAs, visitAsAdmin } from './adminFixtures.js';
import { authCors } from './authFixtures.js';
const headers = { ...authCors, 'Access-Control-Allow-Headers': 'authorization,content-type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
const notice = { id: 1, user_id: 21, order_id: 7, event: 'order_created', resulting_status: 'pendiente', message: 'Tu pedido fue registrado', processing_status: 'processed', attempt_count: 2, is_read: false, created_at: '2026-11-19T09:10:00' };
async function navigate(page: Page, path: string) {
  await page.evaluate((path) => { history.pushState({}, '', path); dispatchEvent(new PopStateEvent('popstate')); }, path);
}

test('login vuelve a la bandeja y leído solo cambia tras consultar el servidor', async ({ page }) => {
  let isRead = false; let writes = 0; let release = () => {};
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/v1/notifications**', async (route) => {
    if (route.request().method() === 'OPTIONS') { await route.fulfill({ headers, body: '' }); return; }
    expect(route.request().headers().authorization).toMatch(/^Bearer /);
    if (route.request().method() === 'POST') {
      writes++; expect(new URL(route.request().url()).pathname).toBe('/api/v1/notifications/1/read'); expect(route.request().postData()).toBeNull();
      await gate; isRead = true; await route.fulfill({ headers, json: {} }); return;
    }
    await route.fulfill({ headers, json: [{ ...notice, is_read: isRead }] });
  });
  await signInAs(page, 'cliente'); await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await navigate(page, '/notifications?source=api');
  await page.getByRole('link', { name: 'Inicia sesión para consultar tus notificaciones', exact: true }).click();
  await page.getByLabel('Correo electrónico', { exact: true }).fill('cliente@example.com');
  await page.getByLabel('Contraseña', { exact: true }).fill('prueba123');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL(/\/notifications\?source=api$/);
  await expect(page.getByText(notice.message, { exact: true })).toBeVisible();
  await expect(page.locator('time')).toHaveText('2026-11-19T09:10:00');
  const mark = page.getByRole('button', { name: 'Marcar notificación 1 como leída', exact: true });
  await mark.click(); await expect(mark).toBeDisabled(); await expect.poll(() => writes).toBe(1);
  release();
  await expect(page.getByRole('status')).toContainText('confirmada por el servidor');
  await expect(page.getByRole('heading', { name: 'Notificación #1', exact: true })).toBeFocused();
  await expect(mark).toBeDisabled();
  await page.getByLabel('Mostrar notificaciones', { exact: true }).selectOption('unread');
  await expect(page.getByText('No hay notificaciones que coincidan con el filtro.', { exact: true })).toBeVisible();
  await page.getByLabel('Mostrar notificaciones', { exact: true }).selectOption('read');
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('un acuse vacío no acredita lectura si GET sigue devolviendo sin leer', async ({ page }) => {
  await page.route('**/api/v1/notifications**', (route) => route.fulfill({ headers, json: route.request().method() === 'POST' ? {} : [notice] }));
  await signInAs(page, 'cliente'); await navigate(page, '/notifications?source=api');
  await page.getByRole('button', { name: 'Marcar notificación 1 como leída', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('todavía no confirma ese aviso como leído');
  await expect(page.getByRole('button', { name: 'Marcar notificación 1 como leída', exact: true })).toBeEnabled();
});

test('una escritura incierta exige consulta y no repite el marcado automáticamente', async ({ page }) => {
  let writes = 0;
  await page.route('**/api/v1/notifications**', async (route) => {
    if (route.request().method() === 'POST') { writes++; await route.abort(); return; }
    await route.fulfill({ headers, json: [{ ...notice, is_read: writes > 0 }] });
  });
  await signInAs(page, 'cliente'); await navigate(page, '/notifications?source=api');
  const mark = page.getByRole('button', { name: 'Marcar notificación 1 como leída', exact: true });
  await mark.click();
  await expect(page.getByRole('alert')).toContainText('Consulta la bandeja antes de repetir');
  await expect(mark).toBeDisabled(); expect(writes).toBe(1);
  await page.getByRole('button', { name: 'Consultar notificaciones', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Bandeja consultada.');
  await expect(mark).toBeDisabled(); expect(writes).toBe(1);
});

test('rechaza avisos ajenos y cerrar sesión retira la bandeja privada', async ({ page }) => {
  let foreign = true;
  await page.route('**/api/v1/notifications', (route) => route.fulfill({ headers, json: [{ ...notice, user_id: foreign ? 22 : 21 }] }));
  await signInAs(page, 'cliente'); await navigate(page, '/notifications?source=api');
  await expect(page.getByRole('alert')).toContainText('incompatibles');
  await expect(page.getByText(notice.message, { exact: true })).toHaveCount(0);
  foreign = false;
  await page.getByRole('button', { name: 'Consultar notificaciones', exact: true }).click();
  await expect(page.getByText(notice.message, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page.getByText(notice.message, { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 });
});

test('intentos administrativos filtran resultados reales y no ofrecen envío o reintento', async ({ page }) => {
  let writes = 0;
  await page.route('**/api/v1/notifications/attempts', (route) => {
    if (route.request().method() !== 'GET') writes++;
    return route.fulfill({ headers, json: [
      { id: 4, notification_id: 1, user_id: 21, order_id: 7, event: 'order_created', result: 'failed', error: 'SMTP temporal', attempted_at: '2026-11-19T09:10:00' },
      { id: 5, notification_id: null, user_id: null, order_id: null, event: 'order_created', result: 'nuevo_resultado', error: null, attempted_at: null },
    ] });
  });
  await visitAsAdmin(page, '/admin/notifications?source=api');
  await expect(page.getByRole('status')).toContainText('2 intentos encontrados');
  await expect(page.getByRole('heading', { name: 'Intento #5', exact: true })).toBeVisible();
  await page.getByLabel('Filtrar por resultado', { exact: true }).selectOption('failed');
  await expect(page.getByRole('heading', { name: 'Intento #5', exact: true })).toHaveCount(0);
  await expect(page.getByText('SMTP temporal', { exact: true })).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole('button', { name: /Enviar|Reintentar/ })).toHaveCount(0); expect(writes).toBe(0);
});

test('403 conserva sesión y 401 retira los intentos administrativos', async ({ page }) => {
  let status = 403;
  await page.route('**/api/v1/notifications/attempts', (route) => route.fulfill({ headers, status, json: { detail: 'No autorizado' } }));
  await visitAsAdmin(page, '/admin/notifications?source=api');
  await expect(page.getByRole('alert')).toHaveText('No tienes permiso para consultar esta información.');
  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible(); status = 401;
  await page.getByRole('button', { name: 'Consultar intentos', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText('Tu sesión venció. Vuelve a iniciar sesión.', { exact: true })).toBeVisible();
});

test('vacío y reintento de bandeja no muestran ejemplos locales', async ({ page }) => {
  let failed = true;
  await page.route('**/api/v1/notifications', (route) => route.fulfill({ headers, status: failed ? 503 : 200, json: failed ? { detail: 'Bandeja temporalmente caída' } : [] }));
  await signInAs(page, 'cliente'); await navigate(page, '/notifications?source=api');
  await expect(page.getByRole('alert')).toHaveText('Bandeja temporalmente caída'); failed = false;
  await page.getByRole('button', { name: 'Consultar notificaciones', exact: true }).click();
  await expect(page.getByText('No tienes notificaciones.', { exact: true })).toBeVisible();
  await expect(page.getByRole('listitem')).toHaveCount(0);
});
