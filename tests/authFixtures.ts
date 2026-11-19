import type { Page } from '@playwright/test';

export const testUser = { id: 21, name: 'Cliente Prueba', email: 'cliente@example.com', role: 'cliente' };
export function testToken(): string {
  return `${Buffer.from('{"alg":"HS256"}').toString('base64url')}.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 43_200 })).toString('base64url')}.firma`;
}
export const authCors = { 'Access-Control-Allow-Origin': '*' };
export async function mockProfile(page: Page, token: string, status = 200) {
  await page.route('**/api/v1/users/me', async (route) => {
    // OPTIONS no contiene Bearer y debe completarse antes del GET real del navegador.
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ headers: { ...authCors, 'Access-Control-Allow-Methods': 'GET', 'Access-Control-Allow-Headers': 'authorization' }, body: '' });
      return;
    }
    if (route.request().headers().authorization !== `Bearer ${token}`) throw new Error('Falta Bearer en la consulta de perfil.');
    await route.fulfill({ status, headers: authCors, json: status === 200 ? testUser : { detail: 'Token inválido o vencido' } });
  });
}
