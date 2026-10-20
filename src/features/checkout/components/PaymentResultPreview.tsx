import type { DemoOrder, PaymentPreviewStatus } from '../types/checkout.types';

const results: Record<PaymentPreviewStatus, { title: string; description: string }> = {
  pending: {
    title: 'Pago pendiente (simulación)',
    description: 'El resultado sigue en proceso. Un resultado pendiente no permite considerar pagado el pedido.',
  },
  approved: {
    title: 'Pago aprobado (simulación)',
    description: 'Esta es la presentación de un resultado aprobado. En producción, el backend debe verificar su autenticidad, pedido, importe y moneda antes de aplicarlo.',
  },
  rejected: {
    title: 'Pago rechazado (simulación)',
    description: 'Un resultado rechazado no permite considerar pagado el pedido. La posibilidad de reintento depende del estado del pedido y su reserva, comprobados por el backend.',
  },
};

const currency = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 2 });

// Laboratorio visual: no inicia intentos ni aplica resultados al pedido.
export function PaymentResultPreview({ order, status, onStatusChange }: {
  order: DemoOrder; status: PaymentPreviewStatus; onStatusChange: (status: PaymentPreviewStatus) => void;
}) {
  const result = results[status];

  return <section className="checkout-form checkout-payment-preview" aria-labelledby="payment-preview-heading">
    <h2 id="payment-preview-heading">Vista previa del resultado de pago</h2>
    <p>Laboratorio visual de demostración. Cambiar este escenario no consulta una pasarela ni verifica o registra pagos.</p>
    <p>Pedido: {order.id}</p>
    <p>Subtotal local de referencia: {currency.format(order.subtotal)} · Moneda: COP. No es un importe de pago calculado por el servidor.</p>
    <div className="checkout-form__field">
      <label htmlFor="payment-preview-status">Resultado a visualizar (demostración)</label>
      <select id="payment-preview-status" value={status} onChange={(event) => {
        const next = event.currentTarget.value;
        if (next === 'pending' || next === 'approved' || next === 'rejected') onStatusChange(next);
      }}>
        <option value="pending">Pendiente</option>
        <option value="approved">Aprobado</option>
        <option value="rejected">Rechazado</option>
      </select>
    </div>
    <div role="status" aria-atomic="true">
      <h3>{result.title}</h3>
      <p>{result.description}</p>
    </div>
    <p>El pedido de demostración continúa pendiente de pago. No se ha realizado ningún cobro ni movimiento de inventario.</p>
  </section>;
}
