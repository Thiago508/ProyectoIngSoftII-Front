export interface ValidationIssue { path: readonly (string | number)[]; message: string }
type ApiErrorKind = 'http' | 'network' | 'timeout' | 'response';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly code?: string;
  readonly issues: readonly ValidationIssue[];
  readonly productId?: number;
  readonly productName?: string;

  constructor(message: string, info: { kind: ApiErrorKind; status?: number; code?: string; issues?: readonly ValidationIssue[]; productId?: number; productName?: string }) {
    super(message);
    this.name = 'ApiError';
    this.kind = info.kind;
    this.status = info.status;
    this.code = info.code;
    this.issues = info.issues ?? [];
    this.productId = info.productId;
    this.productName = info.productName;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Conserva mensajes, códigos y rutas de validación, sin guardar input, ctx o el cuerpo completo.
export function parseApiError(status: number, payload: unknown): ApiError {
  const detail = isRecord(payload) ? payload.detail : undefined;
  const fallback = `La API respondió con un error HTTP ${status}.`;
  if (typeof detail === 'string' && detail.trim()) return new ApiError(detail, { kind: 'http', status });
  if (isRecord(detail)) {
    return new ApiError(typeof detail.message === 'string' ? detail.message : fallback, {
      kind: 'http', status, code: typeof detail.code === 'string' ? detail.code : undefined,
      productId: typeof detail.product_id === 'number' && Number.isSafeInteger(detail.product_id) && detail.product_id > 0 ? detail.product_id : undefined,
      productName: typeof detail.product_name === 'string' ? detail.product_name : undefined,
    });
  }
  if (Array.isArray(detail)) {
    const issues: ValidationIssue[] = detail.filter(isRecord).filter((issue) => typeof issue.msg === 'string').map((issue) => ({
      path: Array.isArray(issue.loc) ? issue.loc.filter((part): part is string | number => typeof part === 'string' || typeof part === 'number') : [],
      message: String(issue.msg),
    }));
    return new ApiError('Revisa los campos indicados por el servidor.', { kind: 'http', status, issues });
  }
  return new ApiError(fallback, { kind: 'http', status });
}

export function normalizeApiBaseUrl(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Configura VITE_API_URL antes de consultar el backend.');
  let url: URL;
  try { url = new URL(value.trim()); } catch { throw new Error('VITE_API_URL debe ser una URL HTTP o HTTPS completa.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('VITE_API_URL debe usar HTTP o HTTPS, sin credenciales, consulta ni fragmento.');
  }
  return url.href.replace(/\/+$/, '');
}

type RequestPayload = { json?: unknown; form?: never } | { form: URLSearchParams; json?: never };
export type ApiRequestOptions = RequestPayload & {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  token?: string;
  signal?: AbortSignal;
};

export function createApiClient(baseUrl: string, dependencies: { fetch?: typeof fetch; timeoutMs?: number } = {}) {
  const base = normalizeApiBaseUrl(baseUrl);
  const fetcher = dependencies.fetch ?? globalThis.fetch;
  const timeoutMs = dependencies.timeoutMs ?? 10_000;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('El tiempo máximo de consulta debe ser positivo.');

  async function request(path: string, options: ApiRequestOptions = {}): Promise<unknown> {
    if (!path.startsWith('/') || path.startsWith('//') || path.includes('#')) throw new Error('Usa una ruta de API relativa a VITE_API_URL, empezando por /.');
    if (options.signal?.aborted) throw new DOMException('Consulta cancelada.', 'AbortError');
    const headers = new Headers({ Accept: 'application/json' });
    if (options.token) headers.set('Authorization', `Bearer ${options.token}`);
    let body: string | undefined;
    if (options.form) {
      body = options.form.toString();
      headers.set('Content-Type', 'application/x-www-form-urlencoded');
    } else if (options.json !== undefined) {
      body = JSON.stringify(options.json);
      headers.set('Content-Type', 'application/json');
    }
    const controller = new AbortController();
    const cancel = () => controller.abort();
    options.signal?.addEventListener('abort', cancel, { once: true });
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
    try {
      const response = await fetcher(`${base}${path}`, {
        method: options.method ?? 'GET', headers, body, signal: controller.signal, credentials: 'omit',
      });
      const raw = await response.text();
      let payload: unknown = null;
      if (raw.trim()) {
        try { payload = JSON.parse(raw); } catch {
          if (response.ok) throw new ApiError('La API devolvió una respuesta que no es JSON válido.', { kind: 'response', status: response.status });
        }
      }
      if (!response.ok) throw parseApiError(response.status, payload);
      return payload;
    } catch (cause: unknown) {
      if (options.signal?.aborted) throw new DOMException('Consulta cancelada.', 'AbortError');
      if (timedOut) throw new ApiError('La consulta al backend superó el tiempo de espera. Puedes volver a comprobar la conexión.', { kind: 'timeout' });
      if (cause instanceof ApiError) throw cause;
      throw new ApiError('No se pudo conectar con el backend. Comprueba la URL, el servidor y la configuración CORS.', { kind: 'network' });
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', cancel);
    }
  }
  return { request };
}
