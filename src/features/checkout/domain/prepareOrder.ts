import type { CheckoutData, CheckoutItem } from "../types/checkout.types";
import { normalizeCheckoutData, validateCheckoutData } from "../utils/checkoutValidation.ts";
import { calculateSubtotal } from "./calculateSubtotal.ts";

/** Prepara una instantánea del pedido sin efectos secundarios. */
export function prepareOrder(customer: CheckoutData, items: readonly CheckoutItem[]) {
  if (Object.keys(validateCheckoutData(customer)).length) throw new Error("Revisa los datos de compra.");
  const subtotal = calculateSubtotal(items);
  const snapshot = { customer: normalizeCheckoutData(customer), items: items.map((item) => ({ ...item })) };
  return { ...snapshot, subtotal };
}
