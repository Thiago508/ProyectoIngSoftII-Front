import { notificationsDemo, type DemoNotification } from './notificationsDemo';

export type ProcessingOutcome = 'pending' | 'processed' | 'failed';
export interface DemoProcessingAttempt {
  number: number;
  occurredAt: string;
  outcome: 'processed' | 'failed';
  detail: string;
}
export interface DemoNotificationProcessing {
  notification: DemoNotification;
  outcome: ProcessingOutcome;
  attempts: readonly DemoProcessingAttempt[];
}

export const processingOutcomeLabels: Record<ProcessingOutcome, string> = {
  pending: 'Pendiente', processed: 'Procesado', failed: 'Fallido',
};

// Historial ilustrativo: no registra envíos ni ejecuta un servicio de notificaciones.
// Cada entrada representa un aviso lógico, aunque contenga varios intentos.
export const notificationProcessingDemo: readonly DemoNotificationProcessing[] = [
  { notification: notificationsDemo[0], outcome: 'pending', attempts: [] },
  { notification: notificationsDemo[1], outcome: 'failed', attempts: [
    { number: 1, occurredAt: '2026-10-20T10:01:00-05:00', outcome: 'failed', detail: 'No se pudo completar este intento de demostración.' },
    { number: 2, occurredAt: '2026-10-20T10:05:00-05:00', outcome: 'failed', detail: 'El segundo intento de demostración tampoco se completó.' },
  ] },
  { notification: notificationsDemo[2], outcome: 'processed', attempts: [
    { number: 1, occurredAt: '2026-10-19T10:01:00-05:00', outcome: 'failed', detail: 'No se pudo completar este intento de demostración.' },
    { number: 2, occurredAt: '2026-10-19T10:05:00-05:00', outcome: 'processed', detail: 'Procesamiento completado en este ejemplo.' },
  ] },
  { notification: notificationsDemo[3], outcome: 'processed', attempts: [
    { number: 1, occurredAt: '2026-10-19T09:01:00-05:00', outcome: 'processed', detail: 'Procesamiento completado en este ejemplo.' },
  ] },
];
