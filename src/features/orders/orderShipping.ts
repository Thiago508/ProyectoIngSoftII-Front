export interface OrderShipping { address: string; phone: string; city: string; department: string }
export type ShippingErrors = Partial<Record<keyof OrderShipping, string>>;
export const emptyOrderShipping: OrderShipping = { address: '', phone: '', city: '', department: '' };
export function normalizeOrderShipping(value: OrderShipping): OrderShipping {
  return { address: value.address.trim(), phone: value.phone.trim(), city: value.city.trim(), department: value.department.trim() };
}
export function validateOrderShipping(value: OrderShipping): ShippingErrors {
  const draft = normalizeOrderShipping(value); const errors: ShippingErrors = {};
  for (const [field, min, max] of [['address', 5, 255], ['city', 2, 120], ['department', 2, 120]] as const) {
    const length = [...draft[field]].length;
    if (length < min || length > max) errors[field] = `Escribe entre ${min} y ${max} caracteres.`;
  }
  if (!/^[0-9+() -]{7,32}$/.test(draft.phone)) errors.phone = 'Escribe un teléfono de 7 a 32 caracteres: números, +, paréntesis, espacios o guiones.';
  return errors;
}
export function orderShippingPayload(value: OrderShipping) {
  if (Object.keys(validateOrderShipping(value)).length) throw new Error('Revisa los datos de envío antes de crear el pedido.');
  const shipping = normalizeOrderShipping(value);
  return { shipping_address: shipping.address, shipping_phone: shipping.phone, shipping_city: shipping.city, shipping_department: shipping.department };
}

export function matchesOrderShipping(actual: { address: string | null; phone: string | null; city: string | null; department: string | null }, expected: OrderShipping): boolean {
  const normalized = normalizeOrderShipping(expected);
  return (Object.keys(normalized) as (keyof OrderShipping)[]).every((field) => actual[field] === normalized[field]);
}
