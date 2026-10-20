import type { CheckoutData } from "../types/checkout.types";
import { validateCheckoutData } from "./checkoutValidation.ts";

export function getCheckoutRedirect(pathname: string, data: CheckoutData,
  hasOrder: boolean, isSubmitting = false): string | null {
  if (isSubmitting) return pathname === "/checkout/summary" ? null : "/checkout/summary";
  if (hasOrder) return pathname === "/checkout/summary" || pathname === "/checkout/payment" ? null : "/checkout/summary";
  if (pathname === "/checkout" || pathname === "/checkout/") return null;
  if (pathname !== "/checkout/payment" && pathname !== "/checkout/summary") return "/checkout";
  if (Object.keys(validateCheckoutData(data)).length) return "/checkout";
  if (pathname === "/checkout/payment") return "/checkout/summary";
  return null;
}
