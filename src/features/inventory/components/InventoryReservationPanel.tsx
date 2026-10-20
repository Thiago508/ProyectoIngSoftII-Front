import { useState } from 'react';
import type { ReleaseReason } from '../demo/releaseDemoReservation';
import { reservationOrders, type DemoReservation } from '../demo/reserveDemoInventory';

interface InventoryReservationPanelProps {
  reservations: readonly DemoReservation[];
  onRelease: (orderId: string, reason: ReleaseReason) => { ok: boolean; message: string };
  onReserve: (orderId: string) => { ok: boolean; message: string };
}

export function InventoryReservationPanel({ reservations, onReserve, onRelease }: InventoryReservationPanelProps) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function handleReserve(orderId: string) {
    const result = onReserve(orderId);
    setMessage(result.ok ? result.message : '');
    setError(result.ok ? '' : result.message);
  }

  function handleRelease(orderId: string, reason: ReleaseReason) {
    const result = onRelease(orderId, reason);
    setMessage(result.ok ? result.message : '');
    setError(result.ok ? '' : result.message);
  }

  return (
    <section className="inventory-page__panel" aria-labelledby="reservation-heading">
      <h2 id="reservation-heading">Reservas de pedidos — laboratorio de demostración</h2>
      <p>Estos pedidos ficticios son independientes del checkout. Reservar aumenta reservado y reduce disponible; no descuenta existente. No se consulta un servidor ni se garantiza concurrencia real.</p>
      <ul className="inventory-page__reservation-orders">
        {reservationOrders.map((order) => <li key={order.id}>
          <h3>{order.id}</h3>
          <ul>{order.lines.map((line) => <li key={line.sku}>{line.sku} · Cantidad: {line.quantity}</li>)}</ul>
          <p>{(() => {
            const reservation = reservations.find((candidate) => candidate.orderId === order.id);
            if (!reservation) return 'Sin reserva registrada en este laboratorio';
            if (reservation.status === 'cancelled') return 'Reserva liberada por cancelación simulada';
            if (reservation.status === 'expired') return 'Reserva liberada por expiración simulada';
            return 'Reserva simulada registrada';
          })()}</p>
          <div className="inventory-page__reservation-actions">
          <button type="button" className="inventory-page__submit" onClick={() => handleReserve(order.id)}>Reservar {order.id} (simulación)</button>
          <button type="button" className="inventory-page__secondary" onClick={() => handleRelease(order.id, 'cancelled')}>Simular cancelación {order.id}</button>
          <button type="button" className="inventory-page__secondary" onClick={() => handleRelease(order.id, 'expired')}>Simular expiración {order.id}</button>
          </div>
        </li>)}
      </ul>
      <p role="status" aria-atomic="true">{message}</p>
      {error && <p className="inventory-page__error" role="alert">{error}</p>}
      <p>Cancelación y expiración son eventos manuales de demostración; no se define un plazo ni se ejecuta un temporizador. Una reserva liberada no se reactiva para el mismo pedido. La conversión por pago sigue pendiente.</p>
    </section>
  );
}
