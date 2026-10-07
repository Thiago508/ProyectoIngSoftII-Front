import type { CheckoutData, CheckoutErrors } from "../types/checkout.types";

const checkoutFields = ["fullName", "email", "phone", "address", "city", "department"] as const;

export function isCheckoutField(name: string): name is keyof CheckoutData {
  return checkoutFields.some((field) => field === name);
}

export function normalizeCheckoutData(data: CheckoutData): CheckoutData {
  return {
    fullName: data.fullName.trim(),
    email: data.email.trim(),
    phone: data.phone.replace(/\s/g, ""),
    address: data.address.trim(),
    city: data.city.trim(),
    department: data.department.trim(),
  };
}

// Reglas iniciales de interfaz; el backend deberá validar los datos definitivos.
export function validateCheckoutData(data: CheckoutData): CheckoutErrors {
  const normalized = normalizeCheckoutData(data);
  const errors: CheckoutErrors = {};
  if (normalized.fullName.length < 3) errors.fullName = "Escribe un nombre de al menos 3 caracteres.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)) errors.email = "Escribe un correo electrónico válido.";
  if (!/^\d{7,10}$/.test(normalized.phone)) errors.phone = "Escribe entre 7 y 10 dígitos, sin indicativo ni símbolos.";
  if (normalized.address.length < 5) errors.address = "Escribe una dirección de al menos 5 caracteres.";
  if (!normalized.city) errors.city = "Escribe la ciudad de envío.";
  if (!normalized.department) errors.department = "Escribe el departamento de envío.";
  return errors;
}
