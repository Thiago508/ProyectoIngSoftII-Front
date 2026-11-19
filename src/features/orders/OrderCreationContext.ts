import { createContext, useContext } from 'react';
import type { OrderShipping } from './orderShipping';
import type { ApiCart } from '../cart/cartApi';
import type { ApiOrder } from './ordersApi';
export interface CreationState { phase: 'idle' | 'submitting' | 'created' | 'rejected' | 'uncertain'; order: ApiOrder | null; reference: number | null; error: string }
export interface OrderCreationApi extends CreationState { shipping: OrderShipping; setShipping: (shipping: OrderShipping) => void; create: (cart: ApiCart) => Promise<void>; recover: () => Promise<void>; prepareAnother: () => void; recovering: boolean }
export const OrderCreationContext = createContext<OrderCreationApi | undefined>(undefined);
export function useOrderCreation(): OrderCreationApi {
  const value = useContext(OrderCreationContext);
  if (!value) throw new Error('La creación requiere OrderCreationProvider.');
  return value;
}
