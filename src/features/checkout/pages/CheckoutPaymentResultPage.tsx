import { Link } from 'react-router-dom';
import { CheckoutStepper } from '../components/CheckoutStepper/CheckoutStepper';
import { PaymentResultPreview } from '../components/PaymentResultPreview';
import type { DemoOrder, PaymentPreviewStatus } from '../types/checkout.types';
import './CheckoutDataPage.css';

export function CheckoutPaymentResultPage({ order, status, onStatusChange }: {
  order: DemoOrder;
  status: PaymentPreviewStatus;
  onStatusChange: (status: PaymentPreviewStatus) => void;
}) {
  return <main className="checkout-page">
    <div className="checkout-page__container checkout-form">
      <CheckoutStepper currentStep="payment" />
      <h1 id="checkout-heading" tabIndex={-1}>Resultado de pago (demostración)</h1>
      <PaymentResultPreview order={order} status={status} onStatusChange={onStatusChange} />
      <Link className="checkout-form__back" to="/checkout/summary">Volver al pedido</Link>
      <Link className="checkout-form__back" to="/checkout/payment">Volver al método de pago</Link>
    </div>
  </main>;
}
