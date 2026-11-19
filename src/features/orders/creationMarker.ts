// Solo una marca anónima por pestaña: no guarda token, usuario, carrito ni ID de pedido.
export const creationMarkerKey = 'fashion.pending-order-request';
export function hasPendingCreation(): boolean { try { return sessionStorage.getItem(creationMarkerKey) !== null; } catch { return false; } }
export function beginCreationMarker(): void { try { sessionStorage.setItem(creationMarkerKey, 'pending'); } catch { throw new Error('No se pudo guardar el estado temporal de la solicitud. No se envió ningún pedido.'); } }
export function clearCreationMarker(): void { try { sessionStorage.removeItem(creationMarkerKey); } catch { /* Si no se puede limpiar, una recarga conserva el bloqueo prudente. */ } }
