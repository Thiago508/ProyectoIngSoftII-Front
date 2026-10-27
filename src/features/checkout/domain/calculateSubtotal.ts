import type { CheckoutItem } from "../types/checkout.types";

export function calculateSubtotal(items: readonly CheckoutItem[]): number {
  if (!items.length) throw new Error("El carrito está vacío. Agrega productos antes de confirmar el pedido.");
  if (items.some((item) => !Number.isSafeInteger(item.quantity) || item.quantity <= 0 ||
      !Number.isSafeInteger(Math.round(item.unitPrice * 100)) || !Number.isFinite(item.unitPrice) || item.unitPrice < 0)) {
    throw new Error("El carrito de demostración no es válido.");
  }
  const total = items.reduce((sum, item) => sum + Math.round(item.unitPrice * 100) * item.quantity, 0);
  if (!Number.isSafeInteger(total)) throw new Error("El total del carrito no es válido.");
  return total / 100;
}
