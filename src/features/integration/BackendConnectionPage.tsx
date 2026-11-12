import { useEffect, useRef, useState } from 'react';
import { AdminHeader } from '../../shared/components/AdminHeader/AdminHeader';
import { ApiError, createApiClient } from '../../shared/api/apiClient';
import { getApiBaseUrl } from '../../shared/api/apiConfig';
import './BackendConnectionPage.css';

type ConnectionState = { status: 'idle' } | { status: 'loading' } | { status: 'success'; entries: [string, string][] } | { status: 'error'; message: string };

export function BackendConnectionPage() {
  let baseUrl = '';
  let configurationError = '';
  try { baseUrl = getApiBaseUrl(); } catch (cause: unknown) { configurationError = cause instanceof Error ? cause.message : 'Revisa VITE_API_URL.'; }
  const [state, setState] = useState<ConnectionState>({ status: 'idle' });
  const current = useRef<AbortController | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
    const previousTitle = document.title;
    document.title = 'Conexión con backend | Fashion Online Store';
    return () => { current.current?.abort(); document.title = previousTitle; };
  }, []);

  async function checkConnection() {
    if (current.current || configurationError) return;
    const controller = new AbortController();
    current.current = controller;
    setState({ status: 'loading' });
    try {
      const payload = await createApiClient(baseUrl).request('/health', { signal: controller.signal });
      if (!payload || typeof payload !== 'object' || Array.isArray(payload) || !Object.values(payload).every((value) => typeof value === 'string')) {
        throw new ApiError('El endpoint de salud respondió con un formato distinto al documentado.', { kind: 'response' });
      }
      const entries = Object.entries(payload).map(([key, value]): [string, string] => [key, String(value)]);
      if (!controller.signal.aborted) setState({ status: 'success', entries });
    } catch (cause: unknown) {
      if (!controller.signal.aborted) setState({ status: 'error', message: cause instanceof Error ? cause.message : 'No se pudo comprobar la conexión.' });
    } finally {
      if (current.current === controller) current.current = null;
    }
  }

  return <>
    <a className="backend-connection__skip" href="#backend-heading">Saltar a la conexión con backend</a>
    <AdminHeader />
    <main className="backend-connection">
      <h1 id="backend-heading" ref={headingRef} tabIndex={-1}>Conexión con backend</h1>
      <p>Esta comprobación consulta el endpoint público de salud del servidor. No inicia sesión ni modifica productos, pedidos o inventario.</p>
      <section className="backend-connection__panel" aria-label="Comprobación de conexión">
        <p>URL base: <code>{baseUrl || 'Sin configurar'}</code></p>
        <p>Consulta: <code>GET /health</code></p>
        {configurationError && <p role="alert">{configurationError} Copia .env.example a .env.local con la dirección correcta y reinicia Vite.</p>}
        <button type="button" disabled={Boolean(configurationError) || state.status === 'loading'} onClick={() => { void checkConnection(); }}>Comprobar conexión</button>
        <p role="status" aria-atomic="true">{state.status === 'loading' ? 'Consultando el estado del backend…' : state.status === 'success' ? 'El servidor respondió al endpoint de salud. Esto no verifica autenticación ni permisos.' : ''}</p>
        {state.status === 'error' && <p role="alert">{state.message}</p>}
        {state.status === 'success' && <dl>{state.entries.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>}
      </section>
      <p>Si falla, comprueba que la dirección corresponde al equipo donde está ejecutándose el backend. Desde otro equipo, 127.0.0.1 apunta al equipo donde está abierto el navegador.</p>
      <p>Un fallo de red en el navegador también puede deberse a CORS; esta pantalla no puede distinguirlo por sí sola. Las demás funcionalidades continúan en modo de demostración.</p>
    </main>
  </>;
}
