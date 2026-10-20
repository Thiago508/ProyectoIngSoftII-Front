import { useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { CheckoutStepper } from "../components/CheckoutStepper/CheckoutStepper";
import type { DemoOrder, PaymentMethod } from "../types/checkout.types";
import "./CheckoutDataPage.css";

import { paymentMethods } from "../paymentMethods";

interface CheckoutPaymentPageProps {
  order: DemoOrder | null;
  method: PaymentMethod | null;
  onChange: (method: PaymentMethod) => void;
  onContinue: () => void;
}

export function CheckoutPaymentPage({ order, method, onChange, onContinue }: CheckoutPaymentPageProps) {
  const [error, setError] = useState(false);
  const firstMethodRef = useRef<HTMLInputElement>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!method) {
      setError(true);
      firstMethodRef.current?.focus();
      return;
    }
    onContinue();
  }

  return (
    <main className="checkout-page">
      <div className="checkout-page__container">
        <CheckoutStepper currentStep="payment" />
        <form className="checkout-form" onSubmit={handleSubmit} noValidate>
          <h1 id="checkout-heading" tabIndex={-1}>Pago</h1>
          <fieldset className="checkout-payment__methods" aria-describedby={error ? "payment-error" : undefined}>
            <legend>Método de pago</legend>
            {paymentMethods.map((option, index) => (
              <label className="checkout-payment__method" key={option.id}>
                <input ref={index === 0 ? firstMethodRef : undefined} type="radio" name="paymentMethod"
                  value={option.id} checked={method === option.id} required aria-invalid={error} aria-describedby={error ? "payment-error" : undefined}
                  onChange={() => { onChange(option.id); setError(false); }} />
                {option.label}
              </label>
            ))}
            {error && <p id="payment-error" className="checkout-form__error">Selecciona un método de pago.</p>}
          </fieldset>
          <p className="checkout-form__status">Selección de demostración para el pedido ya registrado. No inicia un intento de pago ni realiza cobros. La información de tarjeta se solicitará cuando exista una integración de pagos.</p>
          <button className="checkout-form__submit" type="submit">Guardar selección de demostración</button>
          <Link className="checkout-form__back" to="/checkout/summary">Volver al pedido</Link>
        </form>
        {order && <p><Link className="checkout-form__back" to="/checkout/payment/result">Ver resultados de pago (demostración)</Link></p>}
      </div>
    </main>
  );
}
