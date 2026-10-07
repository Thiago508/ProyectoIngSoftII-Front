import { useEffect, useRef, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { CustomerHeader } from "../../shared/components/CustomerHeader/CustomerHeader";
import { CheckoutDataPage } from "./pages/CheckoutDataPage";
import { CheckoutPaymentPage } from "./pages/CheckoutPaymentPage";
import { paymentMethods } from "./paymentMethods";
import { CheckoutStepper } from "./components/CheckoutStepper/CheckoutStepper";
import type { CheckoutData, PaymentMethod } from "./types/checkout.types";
import { validateCheckoutData } from "./utils/checkoutValidation";

const emptyData: CheckoutData = {
  fullName: "", email: "", phone: "", address: "", city: "", department: "",
};

export function CheckoutFlow() {
  const [data, setData] = useState<CheckoutData>(emptyData);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const contentRef = useRef<HTMLDivElement>(null);
  const hasValidData = Object.keys(validateCheckoutData(data)).length === 0;

  useEffect(() => {
    contentRef.current?.querySelector<HTMLElement>("h1")?.focus();
  }, [pathname]);

  return (
    <>
      <CustomerHeader />
      <div ref={contentRef}>
        <Routes>
          <Route index element={<CheckoutDataPage formData={data} onChange={setData} onContinue={(normalizedData) => {
            setData(normalizedData);
            navigate("/checkout/payment");
          }} />} />
          <Route path="payment" element={hasValidData ? (
            <CheckoutPaymentPage method={paymentMethod} onChange={setPaymentMethod} onContinue={() => navigate("/checkout/summary")} />
          ) : <Navigate to="/checkout" replace />} />
          <Route path="summary" element={!hasValidData ? <Navigate to="/checkout" replace /> : !paymentMethod ? <Navigate to="/checkout/payment" replace /> : (
            <main className="checkout-page">
              <div className="checkout-page__container checkout-form">
                <CheckoutStepper currentStep="summary" />
                <h1 tabIndex={-1}>Resumen del borrador</h1>
                <section className="checkout-form__section" aria-label="Datos de envío">
                  <h2>Datos y envío</h2>
                  <p>{data.fullName}<br />{data.email}<br />{data.phone}</p>
                  <p>{data.address}<br />{data.city}, {data.department}</p>
                  <Link to="/checkout">Editar datos y envío</Link>
                </section>
                <section className="checkout-form__section">
                  <h2>Método de pago</h2>
                  <p>{paymentMethods.find((method) => method.id === paymentMethod)?.label}</p>
                </section>
                <p>Este es un borrador. Todavía no se ha creado un pedido ni procesado un pago.</p>
                <Link className="checkout-form__back" to="/checkout/payment">Volver a Pago</Link>
              </div>
            </main>
          )} />
          <Route path="*" element={<Navigate to="/checkout" replace />} />
        </Routes>
      </div>
    </>
  );
}
