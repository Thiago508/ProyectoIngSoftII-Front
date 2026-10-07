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
