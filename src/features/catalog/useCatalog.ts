import { useEffect, useState } from 'react';
import { createApiClient } from '../../shared/api/apiClient';
import { getApiBaseUrl } from '../../shared/api/apiConfig';
import type { Product } from '../products/demo/productsDemo';
import { loadDemoCatalog } from './demo/loadDemoCatalog';
import { loadApiCatalog, type CatalogProduct } from './catalogApi';

type State = { status: 'loading' } | { status: 'ready'; products: readonly CatalogProduct[] } | { status: 'error'; message: string };
export function useCatalog(products: readonly Product[], demo: boolean, productId?: string) {
  const [request, setRequest] = useState({ id: 0, fail: false });
  const [result, setResult] = useState<{ source: readonly Product[]; demo: boolean; productId?: string; requestId: number; state: State } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const baseUrl = demo ? '' : getApiBaseUrl();
        const loaded = demo ? await loadDemoCatalog(products, request.fail, controller.signal) : await loadApiCatalog(createApiClient(baseUrl), baseUrl, productId, controller.signal);
        if (!controller.signal.aborted) setResult({ source: products, demo, productId, requestId: request.id, state: { status: 'ready', products: loaded } });
      } catch (cause: unknown) {
        if (!controller.signal.aborted) setResult({ source: products, demo, productId, requestId: request.id, state: { status: 'error', message: cause instanceof Error ? cause.message : 'No se pudo consultar el catálogo.' } });
      }
    }
    void load();
    return () => controller.abort();
  }, [products, demo, productId, request]);
  const state: State = !result || result.source !== products || result.demo !== demo || result.productId !== productId || result.requestId !== request.id ? { status: 'loading' } : result.state;
  return { state, reload: (fail = false) => { if (state.status !== 'loading') setRequest((previous) => ({ id: previous.id + 1, fail })); } };
}
