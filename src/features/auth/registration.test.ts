import assert from 'node:assert/strict';
import test from 'node:test';
import { validateRegistration } from './registration.ts';

const valid = { name: 'Cliente Demo', email: ' cliente@example.com ', password: ' clave con espacios ', confirmation: ' clave con espacios ' };

test('registro valida los campos y límites documentados sin transformar la contraseña', () => {
  assert.deepEqual(Object.keys(validateRegistration({ name: '', email: '', password: '', confirmation: '' })), ['name', 'email', 'password', 'confirmation']);
  assert.deepEqual(validateRegistration(valid), {});
  assert.ok(validateRegistration({ ...valid, name: 'A' }).name);
  assert.ok(validateRegistration({ ...valid, name: 'A'.repeat(121) }).name);
  for (const password of ['12345', 'a'.repeat(81)]) assert.ok(validateRegistration({ ...valid, password, confirmation: password }).password);
  for (const password of ['123456', 'a'.repeat(80), '😀'.repeat(40)]) assert.deepEqual(validateRegistration({ ...valid, password, confirmation: password }), {});
  assert.ok(validateRegistration({ ...valid, confirmation: valid.password.trim() }).confirmation);
  assert.equal(valid.password, ' clave con espacios ');
});

test('acceso comprueba campos obligatorios, no impone la política de alta ni autentica', async () => {
  const { validateCredentials } = await import('./credentials.ts');
  assert.deepEqual(validateCredentials({ email: '', password: '' }), { email: 'Escribe un correo electrónico válido.', password: 'Escribe una contraseña.' });
  for (const email of ['correo', 'a@b', 'a b@correo.com', 'a@@correo.com']) assert.ok(validateCredentials({ email, password: 'clave' }).email);
  assert.deepEqual(validateCredentials({ email: ' cliente@example.com ', password: 'a' }), {});
});
