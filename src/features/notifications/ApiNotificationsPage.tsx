import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CustomerHeader } from '../../shared/components/CustomerHeader/CustomerHeader';
import { useAuth } from '../auth/AuthContext';
import { useNotificationApi } from './useNotificationApi';
import './NotificationsPage.css';

export function ApiNotificationsPage() {
  const { session } = useAuth();
  const api = useNotificationApi('inbox');
  const [filter, setFilter] = useState('all');
  const [message, setMessage] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const error = useRef<HTMLParagraphElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const notices = api.notices.filter((notice) => filter === 'all' || (filter === 'read' ? notice.isRead : !notice.isRead));
  useEffect(() => {
    heading.current?.focus(); const previous = document.title; document.title = 'Notificaciones | Fashion Online Store';
    return () => { document.title = previous; };
  }, []);
  useEffect(() => {
    if (api.busy) return;
    if (api.error) error.current?.focus();
  }, [api.busy, api.error]);
  return <>
    <CustomerHeader catalogSource="api" cartItemCount={0} cartTo="/cart?source=api" homeTo="/catalog?source=api" contentHeadingId="notifications-heading" skipLabel="Saltar a las notificaciones" />
    <main className="notifications-page"><h1 id="notifications-heading" ref={heading} tabIndex={-1}>Notificaciones</h1>
      <p>Bandeja de tu cuenta en el servidor. Leer un aviso no cambia el estado de un pedido ni de un pago.</p>
      <p><Link to="/notifications?source=demo">Ver notificaciones de demostración</Link></p>
      {!session ? <p><Link to="/login" state={{ returnTo: '/notifications?source=api' }}>Inicia sesión para consultar tus notificaciones</Link></p> : <>
        <button type="button" className="notifications-page__button" disabled={api.busy} onClick={() => { setMessage(''); void api.refresh().then((ok) => { if (ok) { setMessage('Bandeja consultada.'); heading.current?.focus(); } }); }}>Consultar notificaciones</button>
        <p role="status" aria-atomic="true">{api.busy ? 'Consultando notificaciones…' : message || (api.loaded ? `${api.notices.filter((notice) => !notice.isRead).length} notificaciones sin leer.` : '')}</p>
        {api.error && <p role="alert" ref={error} tabIndex={-1} className="notifications-page__error">{api.error}</p>}
        {api.loaded && <>
          <div className="notifications-page__scenario"><label htmlFor="api-notifications-filter">Mostrar notificaciones</label><select id="api-notifications-filter" value={filter} disabled={api.busy} onChange={(event) => { setFilter(event.currentTarget.value); setMessage(''); }}><option value="all">Todas</option><option value="unread">Sin leer</option><option value="read">Leídas</option></select></div>
          {!notices.length && <p>{api.notices.length ? 'No hay notificaciones que coincidan con el filtro.' : 'No tienes notificaciones.'}</p>}
          <ol ref={list} className="notifications-page__list" aria-label="Notificaciones de tu cuenta" aria-busy={api.busy}>{notices.map((notice) => <li key={notice.id} data-notice-id={notice.id}>
            <h2 tabIndex={-1}>Notificación #{notice.id}</h2><p>{notice.message}</p>
            <dl><div><dt>Pedido</dt><dd>{notice.orderId ?? 'Sin pedido asociado'}</dd></div><div><dt>Evento</dt><dd>{notice.event || 'No informado'}</dd></div><div><dt>Estado resultante</dt><dd>{notice.resultingStatus || 'No informado'}</dd></div><div><dt>Procesamiento</dt><dd>{notice.processingStatus || 'No informado'}</dd></div><div><dt>Intentos registrados</dt><dd>{notice.attemptCount}</dd></div><div><dt>Fecha del servidor</dt><dd>{notice.createdAt ? <time dateTime={notice.createdAt}>{notice.createdAt}</time> : 'No informada'}</dd></div><div><dt>Lectura</dt><dd>{notice.isRead ? 'Leída' : 'Sin leer'}</dd></div></dl>
            {notice.orderId !== null && <p><Link to={`/orders/${notice.orderId}?source=api`}>Ver pedido #{notice.orderId}</Link></p>}
            <button type="button" className="notifications-page__button" disabled={api.busy || api.uncertain || notice.isRead} aria-label={`Marcar notificación ${notice.id} como leída`} onClick={() => { void api.markRead(notice.id).then((result) => { if (result.ok) { setMessage(result.message); requestAnimationFrame(() => { (list.current?.querySelector<HTMLElement>(`[data-notice-id="${notice.id}"] h2`) ?? heading.current)?.focus(); }); } }); }}>{notice.isRead ? 'Leída' : 'Marcar como leída'}</button>
          </li>)}</ol>
          <p>Fechas tal como las informa el servidor, sin conversión de zona. El estado de procesamiento no acredita recepción del mensaje.</p>
        </>}
      </>}
      <p><Link to="/catalog?source=api">Volver al catálogo</Link></p>
    </main>
  </>;
}
