import type { Product } from '../../products/demo/productsDemo';

// Consulta asíncrona explícitamente simulada. No define endpoints ni contratos de API.
export function loadDemoCatalog(products: readonly Product[], fail: boolean, signal: AbortSignal): Promise<Product[]> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException('Consulta cancelada.', 'AbortError')); return; }
    const snapshot = products.map((product) => ({ ...product, image: product.image ? { ...product.image } : undefined }));
    function abort() {
      clearTimeout(timer);
      reject(new DOMException('Consulta cancelada.', 'AbortError'));
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort);
      if (fail) reject(new Error('No se pudo consultar el catálogo de demostración. Puedes reintentar sin perder la búsqueda.'));
      else resolve(snapshot);
    }, 300);
    signal.addEventListener('abort', abort, { once: true });
  });
}
