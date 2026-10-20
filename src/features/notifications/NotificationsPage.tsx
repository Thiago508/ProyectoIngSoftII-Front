import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CustomerHeader } from '../../shared/components/CustomerHeader/CustomerHeader';
import { notificationsDemo, notificationStatusLabels } from './notificationsDemo';
import './NotificationsPage.css';

const dateTime = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota',
});

export function NotificationsPage({ cartCount }: { cartCount: number }) {
  const [showExamples, setShowExamples] = useState(true);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const notices = showExamples ? notificationsDemo : [];

  useEffect(() => {
    headingRef.current?.focus();
    const previousTitle = document.title;
    document.title = 'Notificaciones | Fashion Online Store';
    return () => { document.title = previousTitle; };
  }, []);

  return <>
    <CustomerHeader cartItemCount={cartCount} cartTo="/cart" homeTo="/catalog" contentHeadingId="notifications-heading" skipLabel="Saltar a las notificaciones" />
    <main className="notifications-page">
      <h1 id="notifications-heading" ref={headingRef} tabIndex={-1}>Notificaciones</h1>
      <p>Ejemplos de demostración. No pertenecen a una cuenta autenticada ni reflejan cambios reales de tus pedidos.</p>
      <div className="notifications-page__scenario">
        <label htmlFor="notifications-scenario">Escenario de notificaciones (demostración)</label>
        <select id="notifications-scenario" value={showExamples ? 'examples' : 'empty'} onChange={(event) => setShowExamples(event.currentTarget.value === 'examples')}>
          <option value="examples">Mostrar ejemplos</option>
          <option value="empty">Bandeja vacía</option>
        </select>
      </div>
      <p role="status" aria-atomic="true">{notices.length ? `${notices.length} notificaciones de demostración.` : 'No hay notificaciones en este escenario de demostración.'}</p>
      <p>Fechas y horas de Colombia (America/Bogota).</p>
      {notices.length > 0 && <ol className="notifications-page__list" aria-label="Notificaciones de pedidos de demostración">
        {notices.map((notice) => <li key={notice.id}>
          <h2>Pedido {notificationStatusLabels[notice.status].toLocaleLowerCase('es-CO')} (demostración)</h2>
          <dl>
            <div><dt>Identificador del pedido</dt><dd>{notice.orderId}</dd></div>
            <div><dt>Estado resultante</dt><dd>{notificationStatusLabels[notice.status]}</dd></div>
            <div><dt>Fecha y hora del cambio</dt><dd><time dateTime={notice.occurredAt}>{dateTime.format(new Date(notice.occurredAt))}</time></dd></div>
          </dl>
        </li>)}
      </ol>}
      <Link to="/catalog">Volver al catálogo</Link>
    </main>
  </>;
}
