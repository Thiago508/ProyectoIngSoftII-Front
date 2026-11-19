import { createContext, useContext } from 'react';
import type { ApiCart, CartChange } from './cartApi';
export type CartResult = { ok: boolean; message: string };
export interface ApiCartState {
  cart: ApiCart | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  busy: boolean;
  error: string;
  refresh: () => Promise<CartResult>;
  change: (change: CartChange) => Promise<CartResult>;
}
export const ApiCartContext = createContext<ApiCartState | undefined>(undefined);
export function useApiCart(): ApiCartState {
  const cart = useContext(ApiCartContext);
  if (!cart) throw new Error('El carrito real requiere ApiCartProvider.');
  return cart;
}
