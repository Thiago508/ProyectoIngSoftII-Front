import { useEffect, useRef, useState } from 'react';
import { AdminHeader } from '../../shared/components/AdminHeader/AdminHeader';
import { notificationStatusLabels } from './notificationsDemo';
import { notificationProcessingDemo, processingOutcomeLabels, type ProcessingOutcome } from './notificationProcessingDemo';
import './NotificationsPage.css';

const dateTime = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' });
type ProcessingFilter = 'all' | ProcessingOutcome;

export function NotificationProcessingPage() {
  const [filter, setFilter] = useState<ProcessingFilter>('all');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const records = notificationProcessingDemo.filter((record) => filter === 'all' || record.outcome === filter);

  useEffect(() => {
    headingRef.current?.focus();
    const previousTitle = document.title;
    document.title = 'Procesamiento de notificaciones | Fashion Online Store';
    return () => { document.title = previousTitle; };
  }, []);

  return <>
    <a className="notification-processing__skip" href="#notification-processing-heading">Saltar al procesamiento de notificaciones</a>
    <AdminHeader />
    <main className="notifications-page">
      <h1 id="notification-processing-heading" ref={headingRef} tabIndex={-1}>Procesamiento de notificaciones</h1>
      <p>Consulta de demostración, sin autenticación administrativa. Estos historiales son ejemplos fijos y no corresponden a los avisos creados durante la sesión.</p>
      <p>«Procesado» representa el resultado del procesamiento del ejemplo, sin acreditar entrega al destinatario. No se envían mensajes ni se ejecutan reintentos desde esta pantalla.</p>
      <div className="notifications-page__scenario">
        <label htmlFor="processing-filter">Filtrar por resultado de procesamiento</label>
        <select id="processing-filter" value={filter} onChange={(event) => {
          const next = event.currentTarget.value;
          if (next === 'all' || next === 'pending' || next === 'processed' || next === 'failed') setFilter(next);
        }}>
          <option value="all">Todos</option>
          <option value="pending">Pendiente</option>
          <option value="processed">Procesado</option>
          <option value="failed">Fallido</option>
        </select>
      </div>
      <p role="status" aria-atomic="true">{records.length} {records.length === 1 ? 'registro de demostración' : 'registros de demostración'}.</p>
      <p>Fechas y horas de Colombia (America/Bogota).</p>
      <ul className="notifications-page__list" aria-label="Resultados de procesamiento de demostración">
        {records.map(({ notification, outcome, attempts }) => <li key={notification.id}>
          <h2>Notificación {notification.id}</h2>
          <dl>
            <div><dt>Pedido</dt><dd>{notification.orderId}</dd></div>
            <div><dt>Estado del pedido notificado</dt><dd>{notificationStatusLabels[notification.status]}</dd></div>
            <div><dt>Fecha del evento</dt><dd><time dateTime={notification.occurredAt}>{dateTime.format(new Date(notification.occurredAt))}</time></dd></div>
            <div><dt>Resultado del procesamiento</dt><dd><strong>{processingOutcomeLabels[outcome]}</strong></dd></div>
            <div><dt>Intentos registrados</dt><dd>{attempts.length}</dd></div>
          </dl>
          {attempts.length ? <details className="notification-processing__history">
            <summary>Ver intentos de {notification.id}</summary>
            <ol aria-label={`Intentos de ${notification.id}`}>
              {attempts.map((attempt) => <li key={attempt.number}>
                <h3>Intento {attempt.number}: {processingOutcomeLabels[attempt.outcome]}</h3>
                <p><time dateTime={attempt.occurredAt}>{dateTime.format(new Date(attempt.occurredAt))}</time></p>
                <p>{attempt.detail}</p>
              </li>)}
            </ol>
          </details> : <p>No hay intentos registrados en este ejemplo pendiente.</p>}
        </li>)}
      </ul>
    </main>
  </>;
}
