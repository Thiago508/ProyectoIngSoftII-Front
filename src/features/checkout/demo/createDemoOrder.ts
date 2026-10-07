import type { CheckoutData, CheckoutItem, DemoOrder, PaymentMethod } from "../types/checkout.types";
import { normalizeCheckoutData, validateCheckoutData } from "../utils/checkoutValidation.ts";

export function calculateSubtotal(items: readonly CheckoutItem[]): number {
  if (!items.length || items.some((item) => !Number.isSafeInteger(item.quantity) || item.quantity <= 0 ||
      !Number.isSafeInteger(item.unitPrice) || item.unitPrice < 0)) {
    throw new Error("El carrito de demostración no es válido.");
  }
  const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  if (!Number.isSafeInteger(total)) throw new Error("El total del carrito no es válido.");
  return total;
}

// Simulación explícita y sustituible. No realiza peticiones ni modifica inventario.
export async function createDemoOrder(customer: CheckoutData, paymentMethod: PaymentMethod,
  items: readonly CheckoutItem[], simulateFailure = false): Promise<DemoOrder> {
  if (Object.keys(validateCheckoutData(customer)).length) throw new Error("Revisa los datos de compra.");
  const total = calculateSubtotal(items);
  const snapshot = { customer: normalizeCheckoutData(customer), items: items.map((item) => ({ ...item })) };
  await new Promise<void>((resolve) => setTimeout(resolve, 500));
  if (simulateFailure) throw new Error("No se pudo crear el pedido de demostración. Intenta nuevamente.");
  return {
    id: `DEMO-${crypto.randomUUID()}`, createdAt: new Date().toISOString(), status: "pending_payment",
    ...snapshot, paymentMethod, total,
  };
}
