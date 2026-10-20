import { validateCredentials, type Credentials } from './credentials.ts';

export interface RegistrationData extends Credentials { confirmation: string }
export type RegistrationErrors = Partial<Record<keyof RegistrationData, string>>;

// Reglas de interfaz; no comprueba unicidad ni define una política de contraseñas.
export function validateRegistration(data: RegistrationData): RegistrationErrors {
  const errors: RegistrationErrors = { ...validateCredentials(data) };
  if (!data.confirmation) errors.confirmation = 'Confirma la contraseña.';
  else if (data.password !== data.confirmation) errors.confirmation = 'Las contraseñas no coinciden.';
  return errors;
}
