import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckoutStepper } from "../components/CheckoutStepper/CheckoutStepper";
import type { DemoCartScenario } from "../demo/demoCart";
import { calculateSubtotal } from "../demo/createDemoOrder";
import { paymentMethods } from "../paymentMethods";
import type { CheckoutData, CheckoutItem, DemoOrder, PaymentMethod } from "../types/checkout.types";

const currency = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

interface CheckoutSummaryPageProps {
  items: readonly CheckoutItem[];
  scenario: DemoCartScenario;
  onScenarioChange: (scenario: DemoCartScenario) => void;
  unavailableItemIds: readonly string[];
  data: CheckoutData;
  paymentMethod: PaymentMethod | null;
  order: DemoOrder | null;
  isSubmitting: boolean;
  error: string | null;
  onCreate: (simulateFailure: boolean) => Promise<void>;
}

export function CheckoutSummaryPage({ data, paymentMethod, order, isSubmitting, error, onCreate, items: cartItems, scenario, onScenarioChange, unavailableItemIds }: CheckoutSummaryPageProps) {
  const [simulateFailure, setSimulateFailure] = useState(false);
  const items = order?.items ?? cartItems;

  return (
    <main className="checkout-page">
      <p className="sr-only" role="status" aria-atomic="true">
        {isSubmitting ? "Creando pedido de demostración. Espera el resultado." : order ? "Pedido de demostración creado, pendiente de pago." : ""}
      </p>
      <div className="checkout-page__container checkout-form checkout-summary" aria-busy={isSubmitting}>
        <CheckoutStepper currentStep="summary" />
        <h1 id="checkout-heading" tabIndex={-1}>{order ? "Pedido de demostración creado" : "Revisa tu pedido"}</h1>
        <p>Carrito simulado. Los precios y la disponibilidad definitivos deben ser comprobados por el backend.</p>
        {order && <section aria-label="Resultado del pedido">
          <p>Estado: pendiente de pago. No se ha realizado ningún cobro ni descontado inventario.</p>
          <p>Referencia: {order.id}</p>
          <p>Fecha: <time dateTime={order.createdAt}>{new Date(order.createdAt).toLocaleString("es-CO", { timeZone: "America/Bogota" })}</time></p>
        </section>}
        {!order && <div className="checkout-form__field">
          <label htmlFor="demo-cart-scenario">Escenario del carrito (demostración)</label>
          <select id="demo-cart-scenario" value={scenario} disabled={isSubmitting} onChange={(event) => {
            const value = event.currentTarget.value;
            if (value === "available" || value === "empty" || value === "unavailable") onScenarioChange(value);
          }}>
            <option value="available">Carrito válido</option>
            <option value="empty">Carrito vacío</option>
            <option value="unavailable">Disponibilidad insuficiente al confirmar</option>
          </select>
          <p>Estos escenarios solo prueban la interfaz; no consultan ni reservan inventario real.</p>
        </div>}
        <section className="checkout-form__section">
          <h2>Productos</h2>
          {!items.length && <p id="empty-cart-message" className="checkout-form__error">El carrito está vacío. Agrega productos antes de confirmar el pedido. Puedes restaurar el carrito válido en el selector de demostración.</p>}
          <ul className="checkout-summary__items">
            {items.map((item) => <li key={item.id}>
              <div><strong>{item.name}</strong><p>Talla: {item.size} · Cantidad: {item.quantity}</p><p>Precio unitario: {currency.format(item.unitPrice)}</p></div>
              <span>{currency.format(item.unitPrice * item.quantity)}</span>
              {unavailableItemIds.includes(item.id) && <p className="checkout-form__error">{item.name}, talla {item.size}: disponibilidad insuficiente (simulada).</p>}
            </li>)}
          </ul>
          <p className="checkout-summary__total"><strong>Subtotal de productos</strong><strong>{currency.format(order?.subtotal ?? (items.length ? calculateSubtotal(items) : 0))}</strong></p>
          <p>El costo de envío está pendiente de definir; no está incluido en este subtotal.</p>
        </section>
        <section className="checkout-form__section" aria-label="Datos de envío">
          <h2>Datos y envío</h2>
          <p>{data.fullName}<br />{data.email}<br />{data.phone}</p>
          <p>{data.address}<br />{data.city}, {data.department}</p>
          {!order && !isSubmitting && <Link to="/checkout">Editar datos y envío</Link>}
        </section>
        {order && <section className="checkout-form__section">
          <h2>Método de pago seleccionado</h2>
          <p>{paymentMethods.find((method) => method.id === paymentMethod)?.label ?? "Sin seleccionar"}</p>
          <Link className="checkout-form__back" to="/checkout/payment">Seleccionar método de pago (demostración)</Link>
          <p>Esta selección no inicia un pago. La reserva vigente y el importe deberán verificarse desde el backend.</p>
        </section>}
        {!order && <>
          <label><input type="checkbox" checked={simulateFailure} disabled={isSubmitting} onChange={(event) => setSimulateFailure(event.currentTarget.checked)} /> Simular error de creación (demostración)</label>
          {error && <p className="checkout-form__error" role="alert">{error}</p>}
          <button className="checkout-form__submit" type="button" disabled={isSubmitting || !items.length} aria-describedby={!items.length ? "empty-cart-message" : undefined} onClick={() => { void onCreate(simulateFailure); }}>{isSubmitting ? "Creando pedido de demostración…" : "Crear pedido de demostración"}</button>

        </>}
      </div>
    </main>
  );
}
