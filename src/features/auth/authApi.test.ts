import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError, createApiClient } from '../../shared/api/apiClient.ts';
import { authFieldErrors, loginWithApi, readAuthUser, readTokenExpiry, registerWithApi, RegistrationAcceptedError } from './authApi.ts';

const user = { id: 1, name: 'Cliente Demo', email: 'cliente@example.com', role: 'cliente' };
const jwt = (exp: unknown) => `${btoa('{"alg":"HS256"}')}.${btoa(JSON.stringify({ exp, role: 'administrador' }))}.firma`;
const future = Math.floor(Date.now() / 1000) + 43_200;
const token = jwt(future);
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });

for (const operation of ['login', 'register'] as const) test(`${operation}: envía solo campos del contrato y verifica perfil con Bearer`, async () => {
  let calls = 0;
  const client = createApiClient('http://backend.test/api/v1', { fetch: async (url, options) => {
    calls++;
    if (calls === 1) {
      if (operation === 'login') {
        assert.equal(url, 'http://backend.test/api/v1/auth/login');
        assert.equal(new Headers(options?.headers).get('Content-Type'), 'application/x-www-form-urlencoded');
        assert.deepEqual(Object.fromEntries(new URLSearchParams(String(options?.body))), { username: user.email, password: ' clave exacta ', grant_type: 'password' });
      } else {
        assert.equal(url, 'http://backend.test/api/v1/auth/register');
        assert.deepEqual(JSON.parse(String(options?.body)), { name: user.name, email: user.email, password: ' clave exacta ' });
      }
      return json({ access_token: token, token_type: 'bearer', user });
    }
    assert.equal(url, 'http://backend.test/api/v1/users/me');
    assert.equal(new Headers(options?.headers).get('Authorization'), `Bearer ${token}`);
    return json(user);
  } });
  const data = { name: ` ${user.name} `, email: ` ${user.email} `, password: ' clave exacta ', confirmation: ' clave exacta ', role: 'administrador' };
  const session = operation === 'login' ? await loginWithApi(client, data, new AbortController().signal) : await registerWithApi(client, data, new AbortController().signal);
  assert.equal(calls, 2);
  assert.equal(session.expiresAt, future * 1000);
  assert.equal(session.user.role, 'cliente'); // El rol del JWT decodificado no concede permisos.
});

test('rechaza perfiles incompatibles, usuarios discordantes y sesiones vencidas', async () => {
  assert.throws(() => readAuthUser({ ...user, id: '1' }));
  for (const value of ['incorrecto', jwt('fecha'), jwt(-1)]) assert.throws(() => readTokenExpiry(value));
  for (const profile of [{ ...user, id: 2 }, user]) {
    const client = createApiClient('http://backend.test', { fetch: async (url) => String(url).endsWith('/users/me') ? json(profile) : json({ access_token: profile.id === 2 ? token : jwt(1), user }) });
    await assert.rejects(loginWithApi(client, { email: user.email, password: 'clave' }, new AbortController().signal));
  }
});

test('registro aceptado con verificación fallida no invita a repetir el alta', async () => {
  let calls = 0;
  const client = createApiClient('http://backend.test', { fetch: async () => ++calls === 1 ? json({ access_token: token, user }, 201) : json({ detail: 'Sesión inválida' }, 401) });
  await assert.rejects(registerWithApi(client, { ...user, password: 'clave123', confirmation: 'clave123' }, new AbortController().signal), RegistrationAcceptedError);
  assert.equal(calls, 2);
});

test('solo traduce campos de validación permitidos y mapea username a email', () => {
  const error = new ApiError('Validación', { kind: 'http', status: 422, issues: [
    { path: ['body', 'username'], message: 'Correo inválido' }, { path: ['body', 'role'], message: 'No permitido' },
  ] });
  assert.deepEqual(authFieldErrors(error, ['email', 'password'] as const), { email: 'Correo inválido' });
});
