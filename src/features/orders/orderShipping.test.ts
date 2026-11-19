import assert from 'node:assert/strict';
import test from 'node:test';
import { orderShippingPayload, validateOrderShipping, matchesOrderShipping } from './orderShipping.ts';
import { assertOrderShippingContract } from './orderContract.ts';
const shipping = { address: 'Calle 10 # 20 - 30', phone: '+57 (300) 123-4567', city: 'Armenia', department: 'Quindío' };
test('valida longitudes documentadas y teléfono internacional sin reglas antiguas de diez dígitos', () => {
  assert.deepEqual(validateOrderShipping(shipping), {});
  for (const [field, value] of [['address', '1234'], ['address', 'x'.repeat(256)], ['phone', '123456'], ['phone', 'x1234567'], ['phone', '1'.repeat(33)], ['city', 'A'], ['department', 'x'.repeat(121)]] as const) assert.ok(validateOrderShipping({ ...shipping, [field]: value })[field]);
  assert.equal(orderShippingPayload({ ...shipping, city: ' Armenia ' }).shipping_city, 'Armenia');
  assert.equal(matchesOrderShipping(shipping, shipping), true);
  assert.equal(matchesOrderShipping({ ...shipping, address: null }, shipping), false);
});
test('rechaza contrato antiguo sin envío y acepta las cuatro propiedades obligatorias', () => {
  const required = ['items', 'shipping_address', 'shipping_phone', 'shipping_city', 'shipping_department'];
  const schema = (fields: string[]) => ({ paths: { '/api/v1/orders': { post: { requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/CheckoutIn' } } } } } } }, components: { schemas: { CheckoutIn: { required: fields, properties: Object.fromEntries(fields.map((field) => [field, {}])) } } } });
  assert.doesNotThrow(() => assertOrderShippingContract(schema(required), 'http://backend.test/api/v1'));
  assert.throws(() => assertOrderShippingContract(schema(['items']), 'http://backend.test/api/v1'), /No se envió el pedido/);
  assert.throws(() => assertOrderShippingContract({}, 'http://backend.test/api/v1'));
});
