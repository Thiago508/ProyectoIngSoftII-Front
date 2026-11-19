import { ApiError, type createApiClient } from '../../shared/api/apiClient.ts';
import type { Credentials } from './credentials';
import type { RegistrationData } from './registration';

type ApiClient = ReturnType<typeof createApiClient>;
export interface AuthUser { id: number; name: string; email: string; role: string }
export interface AuthSession { accessToken: string; user: AuthUser; expiresAt: number }

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function incompatible(): never {
  throw new ApiError('La API devolvió datos de sesión incompatibles con el contrato.', { kind: 'response' });
}
export function readAuthUser(value: unknown): AuthUser {
  if (!record(value) || typeof value.id !== 'number' || !Number.isSafeInteger(value.id) || value.id <= 0 ||
      typeof value.name !== 'string' || !value.name.trim() || typeof value.email !== 'string' || !value.email.trim() || typeof value.role !== 'string') return incompatible();
  return { id: value.id, name: value.name, email: value.email, role: value.role };
}

// exp solo guía el vencimiento visual; no verifica firma, rol ni autenticidad del JWT.
export function readTokenExpiry(token: string): number {
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || parts.some((part) => !part)) return incompatible();
    const encoded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload: unknown = JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')));
    if (!record(payload) || typeof payload.exp !== 'number' || !Number.isSafeInteger(payload.exp * 1000) || payload.exp <= 0) return incompatible();
    return payload.exp * 1000;
  } catch { return incompatible(); }
}

async function verifySession(client: ApiClient, value: unknown, signal: AbortSignal): Promise<AuthSession> {
  if (!record(value) || typeof value.access_token !== 'string' || !value.access_token ||
      (value.token_type !== undefined && (typeof value.token_type !== 'string' || value.token_type.toLowerCase() !== 'bearer'))) return incompatible();
  const responseUser = readAuthUser(value.user);
  const user = readAuthUser(await client.request('/users/me', { token: value.access_token, signal }));
  if (user.id !== responseUser.id) return incompatible();
  const expiresAt = readTokenExpiry(value.access_token);
  if (expiresAt <= Date.now()) throw new ApiError('La sesión recibida ya venció. Vuelve a iniciar sesión.', { kind: 'http', status: 401 });
  return { accessToken: value.access_token, user, expiresAt };
}

export async function loginWithApi(client: ApiClient, data: Credentials, signal: AbortSignal): Promise<AuthSession> {
  const value = await client.request('/auth/login', {
    method: 'POST', form: new URLSearchParams({ username: data.email.trim(), password: data.password, grant_type: 'password' }), signal,
  });
  return verifySession(client, value, signal);
}

export class RegistrationAcceptedError extends Error {
  constructor() {
    super('El servidor aceptó el registro, pero no se pudo completar la sesión. Ve a iniciar sesión antes de repetir el registro.');
    this.name = 'RegistrationAcceptedError';
  }
}
export async function registerWithApi(client: ApiClient, data: RegistrationData, signal: AbortSignal): Promise<AuthSession> {
  const value = await client.request('/auth/register', {
    method: 'POST', json: { name: data.name.trim(), email: data.email.trim(), password: data.password }, signal,
  });
  try { return await verifySession(client, value, signal); }
  catch { throw new RegistrationAcceptedError(); }
}

export function authFieldErrors<Field extends string>(cause: unknown, fields: readonly Field[]): Partial<Record<Field, string>> {
  const errors: Partial<Record<Field, string>> = {};
  if (!(cause instanceof ApiError) || cause.status !== 422) return errors;
  for (const issue of cause.issues) {
    const property = issue.path.at(-1) === 'username' ? 'email' : issue.path.at(-1);
    const field = fields.find((candidate) => candidate === property);
    if (field) errors[field] = issue.message;
  }
  return errors;
}
