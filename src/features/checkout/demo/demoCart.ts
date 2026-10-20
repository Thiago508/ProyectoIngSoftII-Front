import type { CheckoutItem } from "../types/checkout.types";

// Productos y precios tomados del mockup. No acreditan stock real.
export const demoCart: readonly CheckoutItem[] = [
  { id: "demo-dress", name: "Vestido midi estampado", size: "M", unitPrice: 89900, quantity: 1 },
  { id: "demo-blouse", name: "Blusa manga larga", size: "S", unitPrice: 59900, quantity: 1 },
  { id: "demo-skirt", name: "Falda plisada", size: "M", unitPrice: 69900, quantity: 1 },
];

export type DemoCartScenario = "available" | "empty" | "unavailable";
