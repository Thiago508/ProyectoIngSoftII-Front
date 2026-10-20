import assert from 'node:assert/strict';
import test from 'node:test';
import { validateRegistration } from './registration.ts';

test('rechaza correo inválido y campos obligatorios vacíos', () => {
  assert.deepEqual(Object.keys(validateRegistration({ email: '', password: '', confirmation: '' })), ['email', 'password', 'confirmation']);
  for (const email of ['correo', 'a@b', 'a b@correo.com', 'a@@correo.com']) {
    assert.ok(validateRegistration({ email, password: 'clave', confirmation: 'clave' }).email);
  }
});

test('valida correo con espacios externos y exige confirmación exacta sin transformar la contraseña', () => {
  const data = { email: ' cliente@example.com ', password: ' clave con espacios ', confirmation: ' clave con espacios ' };
  assert.deepEqual(validateRegistration(data), {});
  assert.equal(data.password, ' clave con espacios ');
  assert.ok(validateRegistration({ ...data, confirmation: 'clave con espacios' }).confirmation);
  assert.deepEqual(validateRegistration({ email: 'cliente@example.com', password: 'a', confirmation: 'a' }), {});
});

test('la validación compartida de acceso solo comprueba campos y conserva la contraseña exacta', async () => {
  const { validateCredentials } = await import('./credentials.ts');
  assert.deepEqual(validateCredentials({ email: '', password: '' }), {
    email: 'Escribe un correo electrónico válido.', password: 'Escribe una contraseña.',
  });
  const data = { email: ' cliente@example.com ', password: ' contraseña exacta ' };
  assert.deepEqual(validateCredentials(data), {});
  assert.deepEqual(data, { email: ' cliente@example.com ', password: ' contraseña exacta ' });
  assert.ok(validateCredentials({ ...data, email: 'correo@' }).email);
});
