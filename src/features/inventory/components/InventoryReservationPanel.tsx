import { useState } from 'react';
import { reservationOrders, type DemoReservation } from '../demo/reserveDemoInventory';

interface InventoryReservationPanelProps {
  reservations: readonly DemoReservation[];
  onReserve: (orderId: string) => { ok: boolean; message: string };
}

export function InventoryReservationPanel({ reservations, onReserve }: InventoryReservationPanelProps) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function handleReserve(orderId: string) {
    const result = onReserve(orderId);
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
          <p>{reservations.some((reservation) => reservation.orderId === order.id) ? 'Reserva simulada registrada' : 'Sin reserva registrada en este laboratorio'}</p>
          <button type="button" className="inventory-page__submit" onClick={() => handleReserve(order.id)}>Reservar {order.id} (simulación)</button>
        </li>)}
      </ul>
      <p role="status" aria-atomic="true">{message}</p>
      {error && <p className="inventory-page__error" role="alert">{error}</p>}
      <p>No se define un plazo de reserva. Cancelación, expiración y conversión por pago se incorporarán en incrementos posteriores.</p>
    </section>
  );
}
