export interface CheckoutData {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  department: string;
}

export type CheckoutErrors = Partial<
  Record<keyof CheckoutData, string>
>;

export type PaymentMethod = "card" | "wallet" | "transfer" | "cash";


export interface CheckoutItem {
  id: string;
  name: string;
  size: string;
  unitPrice: number;
  quantity: number;
}

// Modelo local de demostración, no contrato de una API.
export interface DemoOrder {
  id: string;
  createdAt: string;
  status: "pending_payment";
  customer: CheckoutData;
  paymentMethod: PaymentMethod;
  items: CheckoutItem[];
  total: number;
}
