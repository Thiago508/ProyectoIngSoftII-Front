export const adminPaths = ['/admin/products', '/admin/inventory', '/admin/notifications', '/admin/connection'] as const;

// Solo destinos administrativos conocidos; nunca redirigir a una URL recibida sin validar.
export function adminReturnPath(state: unknown): string | null {
  if (!state || typeof state !== 'object' || !('returnTo' in state)) return null;
  return adminPaths.find((path) => path === state.returnTo) ?? null;
}


export function loginReturnPath(state: unknown): string | null {
  const admin = adminReturnPath(state);
  if (admin) return admin;
  if (!state || typeof state !== 'object' || !('returnTo' in state) || typeof state.returnTo !== 'string') return null;
  const path = state.returnTo;
  return path === '/cart?source=api' || /^\/catalog\/[1-9]\d*\?source=api$/.test(path) ? path : null;
}
