import type { Page } from '@playwright/test';
export const testShipping = { address: 'Calle 10 # 20 - 30', phone: '+57 (300) 123-4567', city: 'Armenia', department: 'Quindío' };
export const testShippingPayload = { shipping_address: testShipping.address, shipping_phone: testShipping.phone, shipping_city: testShipping.city, shipping_department: testShipping.department };
export const shippingOrderContract = { paths: { '/api/v1/orders': { post: { requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/CheckoutIn' } } } } } } }, components: { schemas: { CheckoutIn: { properties: { items: {}, shipping_address: {}, shipping_phone: {}, shipping_city: {}, shipping_department: {} }, required: ['items', 'shipping_address', 'shipping_phone', 'shipping_city', 'shipping_department'] } } } };
export async function fillShipping(page: Page) {
  await page.getByLabel('Dirección de envío', { exact: true }).fill(testShipping.address);
  await page.getByLabel('Teléfono de envío', { exact: true }).fill(testShipping.phone);
  await page.getByLabel('Ciudad de envío', { exact: true }).fill(testShipping.city);
  await page.getByLabel('Departamento de envío', { exact: true }).fill(testShipping.department);
}
