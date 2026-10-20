export interface Credentials { email: string; password: string }
export type CredentialsErrors = Partial<Record<keyof Credentials, string>>;

// Valida campos de interfaz, no la existencia de la cuenta ni su contraseña.
export function validateCredentials(data: Credentials): CredentialsErrors {
  const errors: CredentialsErrors = {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) errors.email = 'Escribe un correo electrónico válido.';
  if (!data.password) errors.password = 'Escribe una contraseña.';
  return errors;
}
