import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AdminHeader } from '../../../shared/components/AdminHeader/AdminHeader';
import type { InventorySession } from '../demo/inventorySession';
import { adjustDemoInventory, type AdjustmentErrors } from '../demo/adjustDemoInventory';
import { reserveDemoInventory, reservationOrders } from '../demo/reserveDemoInventory';
import { releaseDemoReservation, type ReleaseReason } from '../demo/releaseDemoReservation';
import { convertDemoReservation } from '../demo/convertDemoReservation';
import { InventoryReservationPanel } from '../components/InventoryReservationPanel';
import './InventoryPage.css';

import type { Product } from '../../products/demo/productsDemo';
import { createDemoVariant, type VariantDraft } from '../demo/createDemoVariant';
import { InventoryVariantForm } from '../components/InventoryVariantForm';

export function InventoryPage({ products, inventory, onInventoryChange }: {
  products: readonly Product[]; inventory: InventorySession; onInventoryChange: (inventory: InventorySession) => void;
}) {
  const [sku, setSku] = useState(inventory.items[0]?.sku ?? '');
  const [quantity, setQuantity] = useState(String(inventory.items[0]?.existing ?? ''));
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<AdjustmentErrors>({});
  const [status, setStatus] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const selectedItem = inventory.items.find((item) => item.sku === sku);

  function handleCreateVariant(draft: VariantDraft) {
    const result = createDemoVariant(inventory.items, products, draft);
    if (result.ok) onInventoryChange({ ...inventory, items: result.items });
    return result;
  }

  function handleAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = adjustDemoInventory(inventory.items, sku, quantity, reason);
    setStatus('');
    if (!result.ok) {
      setErrors(result.errors);
      const firstInvalid = Object.keys(result.errors)[0];
      formRef.current?.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus();
      return;
    }
    onInventoryChange({ ...inventory, items: result.items, history: [result.adjustment, ...inventory.history] });
    setErrors({});
    setReason('');
    setStatus(`Ajuste simulado guardado para ${result.adjustment.sku}: ${result.adjustment.previousQuantity} → ${result.adjustment.newQuantity} unidades. Las reservas no cambian.`);
  }

  function handleReserve(orderId: string) {
    const order = reservationOrders.find((candidate) => candidate.id === orderId);
    if (!order) return { ok: false, message: 'Pedido de demostración desconocido.' };
    const result = reserveDemoInventory(inventory.items, inventory.reservations, order);
    if (!result.ok) return { ok: false, message: result.message };
    onInventoryChange({ ...inventory, items: result.items, reservations: result.reservations });
    setStatus('');
    setErrors({});
    return { ok: true, message: result.repeated
      ? `${orderId}: la reserva ya estaba registrada; no se duplicaron unidades.`
      : `${orderId}: se reservaron todas las líneas. Las existencias no cambian.` };
  }

  function handleRelease(orderId: string, reason: ReleaseReason) {
    const result = releaseDemoReservation(inventory.items, inventory.reservations, orderId, reason);
    if (!result.ok) return { ok: false, message: result.message };
    onInventoryChange({ ...inventory, items: result.items, reservations: result.reservations });
    setStatus('');
    setErrors({});
    return { ok: true, message: result.repeated
      ? `${orderId}: la reserva ya estaba liberada; no se descontaron reservas otra vez.`
      : `${orderId}: reserva liberada por ${reason === 'cancelled' ? 'cancelación' : 'expiración'} simulada. Las existencias no cambian.` };
  }

  function handleConversion(orderId: string) {
    const result = convertDemoReservation(inventory.items, inventory.reservations, orderId);
    if (!result.ok) return { ok: false, message: result.message };
    onInventoryChange({ ...inventory, items: result.items, reservations: result.reservations });
    setStatus('');
    setErrors({});
    return { ok: true, message: result.repeated
      ? `${orderId}: la salida simulada ya estaba aplicada; no se descontó dos veces.`
      : `${orderId}: reserva convertida en salida simulada. Se redujeron existente y reservado; no se procesó un pago real.` };
  }

  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
    const previousTitle = document.title;
    document.title = 'Inventario | Fashion Online Store';
    return () => { document.title = previousTitle; };
  }, []);

  return (
    <div className="inventory-page">
      <a className="inventory-page__skip" href="#inventory-heading">Saltar al inventario</a>
      <AdminHeader />
      <main className="inventory-page__main">
        <h1 id="inventory-heading" ref={headingRef} tabIndex={-1}>Inventario</h1>
        <p className="inventory-page__notice">Datos de demostración. El acceso de administrador todavía no está protegido; no hay autenticación ni conexión a inventario real.</p>
        <section aria-labelledby="inventory-help-heading" className="inventory-page__help">
          <h2 id="inventory-help-heading">Cómo leer las cantidades</h2>
          <p><strong>Existente:</strong> unidades en inventario. <strong>Reservado:</strong> unidades comprometidas en pedidos. <strong>Disponible:</strong> existente menos reservado.</p>
          <p>Un artículo puede tener existencias y ninguna unidad disponible si todas están reservadas. Esta consulta no crea, libera ni descuenta reservas.</p>
        </section>
        <InventoryVariantForm products={products} onCreate={handleCreateVariant} />
        <p id="inventory-table-help">Cada fila representa una talla vendible. En pantallas estrechas, desplaza la tabla horizontalmente para consultar todas las columnas.</p>
        <div className="inventory-page__table-region" role="region" aria-label="Cantidades de inventario por artículo" aria-describedby="inventory-table-help" tabIndex={0}>
          <table className="inventory-page__table">
            <caption>Existencias, reservas y disponibilidad — datos simulados</caption>
            <thead>
              <tr>
                <th scope="col">Artículo / SKU</th>
                <th scope="col">Talla</th>
                <th scope="col">Existente</th>
                <th scope="col">Reservado</th>
                <th scope="col">Disponible</th>
                <th scope="col">Disponibilidad</th>
              </tr>
            </thead>
            <tbody>
              {inventory.items.map((item) => {
                const available = item.existing - item.reserved;
                return (
                  <tr key={item.sku}>
                    <th scope="row">{item.name}<span className="inventory-page__sku">{item.sku}</span></th>
                    <td>{item.size}</td>
                    <td>{item.existing}</td>
                    <td>{item.reserved}</td>
                    <td className="inventory-page__available">{available}</td>
                    <td><span className={`inventory-page__badge ${available === 0 ? 'inventory-page__badge--empty' : ''}`}>{available > 0 ? 'Disponible' : 'Sin disponibilidad'}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <section className="inventory-page__panel" aria-labelledby="adjustment-heading">
          <h2 id="adjustment-heading">Ajustar existencias</h2>
          <p>Simulación en memoria. El usuario del registro es «Administrador de demostración» y no corresponde a una sesión autenticada. Los ajustes, reservas e historial se conservan al navegar y se pierden al recargar. La disponibilidad se refleja en el catálogo de esta sesión.</p>
          <form className="inventory-page__form" ref={formRef} onSubmit={handleAdjustment} noValidate>
            <div className="inventory-page__field">
              <label htmlFor="adjustment-sku">Artículo a ajustar</label>
              <select id="adjustment-sku" name="sku" value={sku} aria-invalid={Boolean(errors.sku)} aria-describedby={errors.sku ? 'adjustment-sku-error' : undefined} onChange={(event) => {
                const nextSku = event.currentTarget.value;
                setSku(nextSku);
                setQuantity(String(inventory.items.find((item) => item.sku === nextSku)?.existing ?? ''));
                setErrors({}); setStatus('');
              }}>
                {inventory.items.map((item) => <option key={item.sku} value={item.sku}>{item.name} · {item.size} · {item.sku}</option>)}
              </select>
              {errors.sku && <p className="inventory-page__error" id="adjustment-sku-error">{errors.sku}</p>}
            </div>
            <p id="adjustment-quantity-help">Existente: {selectedItem?.existing ?? '—'} · Reservado: {selectedItem?.reserved ?? '—'}. La nueva cantidad es el total de existencias, no una cantidad a sumar.</p>
            <div className="inventory-page__field">
              <label htmlFor="adjustment-quantity">Nueva cantidad existente</label>
              <input id="adjustment-quantity" name="quantity" type="text" inputMode="numeric" value={quantity} required aria-invalid={Boolean(errors.quantity)} aria-describedby={`adjustment-quantity-help${errors.quantity ? ' adjustment-quantity-error' : ''}`} onChange={(event) => { setQuantity(event.currentTarget.value); setErrors((previous) => ({ ...previous, quantity: undefined })); setStatus(''); }} />
              {errors.quantity && <p className="inventory-page__error" id="adjustment-quantity-error">{errors.quantity}</p>}
            </div>
            <div className="inventory-page__field">
              <label htmlFor="adjustment-reason">Motivo del ajuste</label>
              <textarea id="adjustment-reason" name="reason" value={reason} required rows={3} aria-invalid={Boolean(errors.reason)} aria-describedby={errors.reason ? 'adjustment-reason-error' : undefined} onChange={(event) => { setReason(event.currentTarget.value); setErrors((previous) => ({ ...previous, reason: undefined })); setStatus(''); }} />
              {errors.reason && <p className="inventory-page__error" id="adjustment-reason-error">{errors.reason}</p>}
            </div>
            <button className="inventory-page__submit" type="submit">Guardar ajuste de demostración</button>
          </form>
          <p role="status" aria-atomic="true">{status}</p>
        </section>
        <InventoryReservationPanel reservations={inventory.reservations} onReserve={handleReserve} onRelease={handleRelease} onConvert={handleConversion} />
        <section className="inventory-page__panel" aria-labelledby="adjustment-history-heading">
          <h2 id="adjustment-history-heading">Historial de ajustes de esta sesión</h2>
          {!inventory.history.length ? <p>Todavía no hay ajustes registrados.</p> : <ol className="inventory-page__history">
            {inventory.history.map((adjustment) => <li key={adjustment.id}>
              <h3>{adjustment.name} · Talla {adjustment.size}</h3>
              <p>SKU: {adjustment.sku}</p>
              <p>Cantidad anterior: {adjustment.previousQuantity} · Nueva cantidad: {adjustment.newQuantity}</p>
              <p>Motivo: {adjustment.reason}</p>
              <p>Usuario: {adjustment.actor}</p>
              <p>Fecha: <time dateTime={adjustment.createdAt}>{new Date(adjustment.createdAt).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</time></p>
            </li>)}
          </ol>}
        </section>
      </main>
    </div>
  );
}
