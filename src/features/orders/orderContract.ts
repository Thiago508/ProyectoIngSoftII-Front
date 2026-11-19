import { createApiClient } from '../../shared/api/apiClient.ts';
const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
export const requiredOrderFields = ['items', 'shipping_address', 'shipping_phone', 'shipping_city', 'shipping_department'] as const;
export function assertOrderShippingContract(value: unknown, apiBase: string): void {
  const incompatible = () => { throw new Error('La versión conectada del backend no confirma los datos de envío obligatorios. Actualiza el servidor o configura la URL de la versión acordada. No se envió el pedido.'); };
  if (!object(value) || !object(value.paths) || !object(value.components) || !object(value.components.schemas)) return incompatible();
  const route = value.paths[`${new URL(apiBase).pathname.replace(/\/$/, '')}/orders`];
  if (!object(route) || !object(route.post) || !object(route.post.requestBody) || !object(route.post.requestBody.content)) return incompatible();
  const body = route.post.requestBody.content['application/json'];
  if (!object(body) || !object(body.schema)) return incompatible();
  let schema = body.schema;
  if (typeof schema.$ref === 'string') {
    if (!schema.$ref.startsWith('#/components/schemas/')) return incompatible();
    const resolved = value.components.schemas[schema.$ref.slice('#/components/schemas/'.length)];
    if (!object(resolved)) return incompatible();
    schema = resolved;
  }
  const required = schema.required; const properties = schema.properties;
  if (!Array.isArray(required) || !object(properties) || requiredOrderFields.some((field) => !required.includes(field) || !(field in properties))) return incompatible();
}
export async function verifyOrderShippingContract(apiBase: string, signal: AbortSignal): Promise<void> {
  const schema = await createApiClient(new URL(apiBase).origin).request('/openapi.json', { signal });
  assertOrderShippingContract(schema, apiBase);
}
