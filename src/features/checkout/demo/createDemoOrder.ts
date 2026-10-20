import type { CheckoutData, CheckoutItem, DemoOrder } from "../types/checkout.types";
import { normalizeCheckoutData, validateCheckoutData } from "../utils/checkoutValidation.ts";

export function calculateSubtotal(items: readonly CheckoutItem[]): number {
  if (!items.length) throw new Error("El carrito está vacío. Agrega productos antes de confirmar el pedido.");
  if (items.some((item) => !Number.isSafeInteger(item.quantity) || item.quantity <= 0 ||
      !Number.isSafeInteger(item.unitPrice) || item.unitPrice < 0)) {
    throw new Error("El carrito de demostración no es válido.");
  }
  const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  if (!Number.isSafeInteger(total)) throw new Error("El total del carrito no es válido.");
  return total;
}

export class DemoAvailabilityError extends Error {
  readonly itemIds: readonly string[];

  constructor(itemIds: readonly string[]) {
    super("No se pudo crear el pedido: hay artículos sin disponibilidad suficiente. No se ha registrado ningún pedido.");
    this.name = "DemoAvailabilityError";
    this.itemIds = [...itemIds];
  }
}

// Simulación explícita y sustituible. No realiza peticiones ni modifica inventario.
export async function createDemoOrder(customer: CheckoutData,
  items: readonly CheckoutItem[], simulateFailure = false, unavailableItemIds: readonly string[] = []): Promise<DemoOrder> {
  if (Object.keys(validateCheckoutData(customer)).length) throw new Error("Revisa los datos de compra.");
  const subtotal = calculateSubtotal(items);
  const snapshot = { customer: normalizeCheckoutData(customer), items: items.map((item) => ({ ...item })) };
  await new Promise<void>((resolve) => setTimeout(resolve, 500));
  const unavailable = snapshot.items.filter((item) => unavailableItemIds.includes(item.id)).map((item) => item.id);
  if (unavailable.length) throw new DemoAvailabilityError(unavailable);
  if (simulateFailure) throw new Error("No se pudo crear el pedido de demostración. Intenta nuevamente.");
  return {
    id: `DEMO-${crypto.randomUUID()}`, createdAt: new Date().toISOString(), status: "pending_payment",
    ...snapshot, subtotal,
  };
}
