export type NotificationOrderStatus = 'registered' | 'paid' | 'cancelled' | 'shipped';

export interface DemoNotification {
  id: string;
  orderId: string;
  status: NotificationOrderStatus;
  occurredAt: string;
}

export const notificationStatusLabels: Record<NotificationOrderStatus, string> = {
  registered: 'Registrado', paid: 'Pagado', cancelled: 'Cancelado', shipped: 'Enviado',
};

// Ejemplos de presentación, separados de pedidos, pagos y clientes de la aplicación.
// Ordenados desde el cambio más reciente. No representan eventos verificados.
export const notificationsDemo: readonly DemoNotification[] = [
  { id: 'notice-demo-4', orderId: 'DEMO-1001', status: 'shipped', occurredAt: '2026-10-20T11:00:00-05:00' },
  { id: 'notice-demo-3', orderId: 'DEMO-1002', status: 'cancelled', occurredAt: '2026-10-20T10:00:00-05:00' },
  { id: 'notice-demo-2', orderId: 'DEMO-1001', status: 'paid', occurredAt: '2026-10-19T10:00:00-05:00' },
  { id: 'notice-demo-1', orderId: 'DEMO-1001', status: 'registered', occurredAt: '2026-10-19T09:00:00-05:00' },
];
