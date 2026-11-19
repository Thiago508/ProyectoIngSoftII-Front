import { validateCredentials, type Credentials } from './credentials.ts';

export interface RegistrationData extends Credentials { name: string; confirmation: string }
export type RegistrationErrors = Partial<Record<keyof RegistrationData, string>>;

// Reglas UserCreate del OpenAPI; unicidad y rol los decide el servidor.
export function validateRegistration(data: RegistrationData): RegistrationErrors {
  const errors: RegistrationErrors = {};
  const nameLength = Array.from(data.name.trim()).length;
  if (nameLength < 2 || nameLength > 120) errors.name = 'Escribe un nombre de entre 2 y 120 caracteres.';
  Object.assign(errors, validateCredentials(data));
  const passwordLength = Array.from(data.password).length;
  if (data.password && (passwordLength < 6 || passwordLength > 80)) errors.password = 'La contraseña debe tener entre 6 y 80 caracteres.';
  if (!data.confirmation) errors.confirmation = 'Confirma la contraseña.';
  else if (data.password !== data.confirmation) errors.confirmation = 'Las contraseñas no coinciden.';
  return errors;
}
