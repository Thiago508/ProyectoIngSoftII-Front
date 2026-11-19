import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminHeader } from '../../shared/components/AdminHeader/AdminHeader';
import { useNotificationApi } from './useNotificationApi';
import './NotificationsPage.css';

export function ApiNotificationAttemptsPage() {
  const api = useNotificationApi('attempts');
  const [filter, setFilter] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const error = useRef<HTMLParagraphElement>(null);
  const results = [...new Set(api.attempts.map((attempt) => attempt.result).filter(Boolean))];
  const attempts = api.attempts.filter((attempt) => !filter || attempt.result === filter);
  useEffect(() => {
    heading.current?.focus(); const previous = document.title; document.title = 'Intentos de notificación | Fashion Online Store';
    return () => { document.title = previous; };
  }, []);
  useEffect(() => { if (!api.busy && api.error) error.current?.focus(); }, [api.busy, api.error]);
  return <>
    <a className="notification-processing__skip" href="#notification-attempts-heading">Saltar a los intentos de notificación</a><AdminHeader />
    <main className="notifications-page"><h1 id="notification-attempts-heading" ref={heading} tabIndex={-1}>Intentos de notificación</h1>
      <p>Consulta administrativa del servidor. No se envían mensajes ni se ejecutan reintentos desde esta pantalla.</p><p><Link to="/admin/notifications?source=demo">Ver intentos de demostración</Link></p>
      <button type="button" className="notifications-page__button" disabled={api.busy} onClick={() => { void api.refresh().then((ok) => { if (ok) heading.current?.focus(); }); }}>Consultar intentos</button>
      <p role="status" aria-atomic="true">{api.busy ? 'Consultando intentos…' : api.loaded ? `${attempts.length} intentos encontrados.` : ''}</p>
      {api.error && <p role="alert" tabIndex={-1} ref={error} className="notifications-page__error">{api.error}</p>}
      {api.loaded && <>
        <div className="notifications-page__scenario"><label htmlFor="api-attempts-filter">Filtrar por resultado</label><select id="api-attempts-filter" value={filter} disabled={api.busy} onChange={(event) => setFilter(event.currentTarget.value)}><option value="">Todos</option>{results.map((result) => <option key={result} value={result}>{result}</option>)}</select></div>
        {!attempts.length && <p>{api.attempts.length ? 'No hay intentos que coincidan con el filtro.' : 'No hay intentos registrados.'}</p>}
        <ul className="notifications-page__list" aria-label="Intentos registrados por el servidor" aria-busy={api.busy}>{attempts.map((attempt) => <li key={attempt.id}><h2>Intento #{attempt.id}</h2><dl><div><dt>Notificación</dt><dd>{attempt.notificationId ?? 'Sin asociación'}</dd></div><div><dt>Usuario</dt><dd>{attempt.userId ?? 'Sin asociación'}</dd></div><div><dt>Pedido</dt><dd>{attempt.orderId ?? 'Sin asociación'}</dd></div><div><dt>Evento</dt><dd>{attempt.event || 'No informado'}</dd></div><div><dt>Resultado</dt><dd>{attempt.result || 'No informado'}</dd></div><div><dt>Detalle de error</dt><dd>{attempt.error ?? 'Sin error informado'}</dd></div><div><dt>Fecha del servidor</dt><dd>{attempt.attemptedAt ? <time dateTime={attempt.attemptedAt}>{attempt.attemptedAt}</time> : 'No informada'}</dd></div></dl></li>)}</ul>
        <p>Fechas tal como las informa el servidor, sin conversión de zona. Los resultados se muestran sin inferir recepción por el destinatario.</p>
      </>}
    </main>
  </>;
}
