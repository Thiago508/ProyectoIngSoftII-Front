import type { CheckoutData, PaymentMethod } from "../types/checkout.types";
import { validateCheckoutData } from "./checkoutValidation.ts";

export function getCheckoutRedirect(pathname: string, data: CheckoutData,
  paymentMethod: PaymentMethod | null, hasOrder: boolean, isSubmitting = false): string | null {
  if (hasOrder || isSubmitting) return pathname === "/checkout/summary" ? null : "/checkout/summary";
  if (pathname === "/checkout" || pathname === "/checkout/") return null;
  if (pathname !== "/checkout/payment" && pathname !== "/checkout/summary") return "/checkout";
  if (Object.keys(validateCheckoutData(data)).length) return "/checkout";
  if (pathname === "/checkout/summary" && !paymentMethod) return "/checkout/payment";
  return null;
}
