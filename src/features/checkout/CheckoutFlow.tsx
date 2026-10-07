import { useEffect, useRef, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { CustomerHeader } from "../../shared/components/CustomerHeader/CustomerHeader";
import { CheckoutDataPage } from "./pages/CheckoutDataPage";
import { CheckoutPaymentPage } from "./pages/CheckoutPaymentPage";
import { CheckoutSummaryPage } from "./pages/CheckoutSummaryPage";
import type { CheckoutData, DemoOrder, PaymentMethod } from "./types/checkout.types";
import { validateCheckoutData } from "./utils/checkoutValidation";

const emptyData: CheckoutData = {
  fullName: "", email: "", phone: "", address: "", city: "", department: "",
};

export function CheckoutFlow() {
  const [data, setData] = useState<CheckoutData>(emptyData);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [order, setOrder] = useState<DemoOrder | null>(null);
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
          <Route index element={order ? <Navigate to="/checkout/summary" replace /> : <CheckoutDataPage formData={data} onChange={setData} onContinue={(normalizedData) => {
            setData(normalizedData);
            navigate("/checkout/payment");
          }} />} />
          <Route path="payment" element={order ? <Navigate to="/checkout/summary" replace /> : hasValidData ? (
            <CheckoutPaymentPage method={paymentMethod} onChange={setPaymentMethod} onContinue={() => navigate("/checkout/summary")} />
          ) : <Navigate to="/checkout" replace />} />
          <Route path="summary" element={!hasValidData ? <Navigate to="/checkout" replace /> : !paymentMethod ? <Navigate to="/checkout/payment" replace /> : (
            <CheckoutSummaryPage data={order?.customer ?? data} paymentMethod={order?.paymentMethod ?? paymentMethod} order={order} onCreated={setOrder} />
          )} />
          <Route path="*" element={<Navigate to="/checkout" replace />} />
        </Routes>
      </div>
    </>
  );
}
