export const adminPaths = ['/admin/products', '/admin/inventory', '/admin/notifications', '/admin/connection'] as const;

// Solo destinos administrativos conocidos; nunca redirigir a una URL recibida sin validar.
export function adminReturnPath(state: unknown): string | null {
  if (!state || typeof state !== 'object' || !('returnTo' in state)) return null;
  const path = state.returnTo;
  return typeof path === 'string' && adminPaths.some((candidate) => path === candidate || path === `${candidate}?source=api` || path === `${candidate}?source=demo`) ? path : null;
}


export function loginReturnPath(state: unknown): string | null {
  const admin = adminReturnPath(state);
  if (admin) return admin;
  if (!state || typeof state !== 'object' || !('returnTo' in state) || typeof state.returnTo !== 'string') return null;
  const path = state.returnTo;
  return path === '/checkout/review?source=api' || path === '/orders?source=api' || /^\/orders\/[1-9]\d*\?source=api$/.test(path) || path === '/notifications?source=api' || path === '/cart?source=api' || /^\/catalog\/[1-9]\d*\?source=api$/.test(path) ? path : null;
}
