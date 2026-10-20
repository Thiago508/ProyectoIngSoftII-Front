export interface RegistrationData { email: string; password: string; confirmation: string }
export type RegistrationErrors = Partial<Record<keyof RegistrationData, string>>;

// Reglas de interfaz; no comprueba unicidad ni define una política de contraseñas.
export function validateRegistration(data: RegistrationData): RegistrationErrors {
  const errors: RegistrationErrors = {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) errors.email = 'Escribe un correo electrónico válido.';
  if (!data.password) errors.password = 'Escribe una contraseña.';
  if (!data.confirmation) errors.confirmation = 'Confirma la contraseña.';
  else if (data.password !== data.confirmation) errors.confirmation = 'Las contraseñas no coinciden.';
  return errors;
}
