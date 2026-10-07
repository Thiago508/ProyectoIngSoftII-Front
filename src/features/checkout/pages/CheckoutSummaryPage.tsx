import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CheckoutStepper } from "../components/CheckoutStepper/CheckoutStepper";
import { demoCart } from "../demo/demoCart";
import { calculateSubtotal, createDemoOrder } from "../demo/createDemoOrder";
import { paymentMethods } from "../paymentMethods";
import type { CheckoutData, DemoOrder, PaymentMethod } from "../types/checkout.types";

const currency = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

interface CheckoutSummaryPageProps {
  data: CheckoutData;
  paymentMethod: PaymentMethod;
  order: DemoOrder | null;
  onCreated: (order: DemoOrder) => void;
}

export function CheckoutSummaryPage({ data, paymentMethod, order, onCreated }: CheckoutSummaryPageProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [simulateFailure, setSimulateFailure] = useState(false);
  const inFlight = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const items = order?.items ?? demoCart;

  async function handleCreate() {
    if (inFlight.current || order) return;
    inFlight.current = true;
    setIsSubmitting(true);
    setError(null);
    try {
      const created = await createDemoOrder(data, paymentMethod, demoCart, simulateFailure);
      onCreated(created);
      headingRef.current?.focus();
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "No se pudo crear el pedido de demostración.");
    } finally {
      inFlight.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <main className="checkout-page">
      <div className="checkout-page__container checkout-form" aria-busy={isSubmitting}>
        <CheckoutStepper currentStep="summary" />
        <h1 ref={headingRef} tabIndex={-1}>{order ? "Pedido de demostración creado" : "Revisa tu pedido"}</h1>
        <p>Carrito simulado. Los precios y la disponibilidad definitivos deben ser comprobados por el backend.</p>
        {order && <div role="status">
          <p>Estado: pendiente de pago. No se ha realizado ningún cobro ni descontado inventario.</p>
          <p>Referencia: {order.id}</p>
          <p>Fecha: {new Date(order.createdAt).toLocaleString("es-CO")}</p>
        </div>}
        <section className="checkout-form__section">
          <h2>Productos</h2>
          <ul className="checkout-summary__items">
            {items.map((item) => <li key={item.id}>
              <div><strong>{item.name}</strong><p>Talla: {item.size} · Cantidad: {item.quantity}</p></div>
              <span>{currency.format(item.unitPrice * item.quantity)}</span>
            </li>)}
          </ul>
          <p className="checkout-summary__total"><strong>Subtotal de productos</strong><strong>{currency.format(order?.total ?? calculateSubtotal(items))}</strong></p>
          <p>El costo de envío está pendiente de definir; no está incluido en este subtotal.</p>
        </section>
        <section className="checkout-form__section" aria-label="Datos de envío">
          <h2>Datos y envío</h2>
          <p>{data.fullName}<br />{data.email}<br />{data.phone}</p>
          <p>{data.address}<br />{data.city}, {data.department}</p>
          {!order && !isSubmitting && <Link to="/checkout">Editar datos y envío</Link>}
        </section>
        <section className="checkout-form__section">
          <h2>Método de pago seleccionado</h2>
          <p>{paymentMethods.find((method) => method.id === paymentMethod)?.label}</p>
        </section>
        {!order && <>
          <label><input type="checkbox" checked={simulateFailure} disabled={isSubmitting} onChange={(event) => setSimulateFailure(event.currentTarget.checked)} /> Simular error de creación (demostración)</label>
          {error && <p className="checkout-form__error" role="alert">{error}</p>}
          <button className="checkout-form__submit" type="button" disabled={isSubmitting} onClick={handleCreate}>{isSubmitting ? "Creando pedido de demostración…" : "Crear pedido de demostración"}</button>
          {!isSubmitting && <Link className="checkout-form__back" to="/checkout/payment">Volver a Pago</Link>}
        </>}
      </div>
    </main>
  );
}
