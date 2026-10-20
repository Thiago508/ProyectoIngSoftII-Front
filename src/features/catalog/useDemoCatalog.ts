import { useEffect, useState } from 'react';
import type { Product } from '../products/demo/productsDemo';
import { loadDemoCatalog } from './demo/loadDemoCatalog';

type CatalogLoadState = { status: 'loading' } | { status: 'ready'; products: readonly Product[] } | { status: 'error'; message: string };
type CatalogResult = { source: readonly Product[]; requestId: number } & Exclude<CatalogLoadState, { status: 'loading' }>;

export function useDemoCatalog(products: readonly Product[]) {
  const [request, setRequest] = useState({ id: 0, fail: false });
  const [result, setResult] = useState<CatalogResult | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void loadDemoCatalog(products, request.fail, controller.signal).then((loaded) => {
      if (!controller.signal.aborted) setResult({ source: products, requestId: request.id, status: 'ready', products: loaded });
    }, (cause: unknown) => {
      if (!controller.signal.aborted) setResult({ source: products, requestId: request.id, status: 'error', message: cause instanceof Error ? cause.message : 'No se pudo consultar el catálogo de demostración.' });
    });
    return () => controller.abort();
  }, [products, request]);

  // Una respuesta de otra fuente o intento nunca se presenta como el catálogo actual.
  const state: CatalogLoadState = !result || result.source !== products || result.requestId !== request.id ? { status: 'loading' } : result;
  function reload(fail = false) {
    if (state.status !== 'loading') setRequest((previous) => ({ id: previous.id + 1, fail }));
  }
  return { state, reload };
}
