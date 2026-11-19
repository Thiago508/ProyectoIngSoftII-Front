import { createContext, useContext } from 'react';
import type { ApiOrder } from '../orders/ordersApi';
import type { TestCardToken } from './paymentApi';
export interface PaymentState { busy: boolean; orderId: number | null; error: string; needsRead: boolean }
export interface PaymentApi extends PaymentState { pay: (order: ApiOrder, cardToken: TestCardToken) => Promise<ApiOrder | null>; acknowledgeRead: (orderId: number) => void }
export const PaymentContext = createContext<PaymentApi | undefined>(undefined);
export function usePayment() { const value = useContext(PaymentContext); if (!value) throw new Error('El pago requiere PaymentProvider.'); return value; }
