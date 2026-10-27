import type { CheckoutData, CheckoutItem, DemoOrder } from "../types/checkout.types";
import { prepareOrder } from "../domain/prepareOrder.ts";
export { calculateSubtotal } from "../domain/calculateSubtotal.ts";

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
  const { subtotal, ...snapshot } = prepareOrder(customer, items);
  await new Promise<void>((resolve) => setTimeout(resolve, 500));
  const unavailable = snapshot.items.filter((item) => unavailableItemIds.includes(item.id)).map((item) => item.id);
  if (unavailable.length) throw new DemoAvailabilityError(unavailable);
  if (simulateFailure) throw new Error("No se pudo crear el pedido de demostración. Intenta nuevamente.");
  return {
    id: `DEMO-${crypto.randomUUID()}`, createdAt: new Date().toISOString(), status: "pending_payment",
    ...snapshot, subtotal,
  };
}
