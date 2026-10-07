import type { PaymentMethod } from "./types/checkout.types";

export const paymentMethods: ReadonlyArray<{ id: PaymentMethod; label: string }> = [
  { id: "card", label: "Tarjeta de crédito / débito" },
  { id: "wallet", label: "Nequi / Daviplata" },
  { id: "transfer", label: "Transferencia bancaria" },
  { id: "cash", label: "Pago en efectivo (contra entrega)" },
];

