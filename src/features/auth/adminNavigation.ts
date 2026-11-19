export const adminPaths = ['/admin/products', '/admin/inventory', '/admin/notifications', '/admin/connection'] as const;

// Solo destinos administrativos conocidos; nunca redirigir a una URL recibida sin validar.
export function adminReturnPath(state: unknown): string | null {
  if (!state || typeof state !== 'object' || !('returnTo' in state)) return null;
  return adminPaths.find((path) => path === state.returnTo) ?? null;
}

