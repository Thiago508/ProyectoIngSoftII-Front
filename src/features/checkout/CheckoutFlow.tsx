import { useEffect, useRef, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { CustomerHeader } from "../../shared/components/CustomerHeader/CustomerHeader";
import { CheckoutDataPage } from "./pages/CheckoutDataPage";
import { CheckoutPaymentPage } from "./pages/CheckoutPaymentPage";
import { CheckoutSummaryPage } from "./pages/CheckoutSummaryPage";
import type { CheckoutData, DemoOrder, PaymentMethod } from "./types/checkout.types";
import { getCheckoutRedirect } from "./utils/checkoutNavigation";
import { createDemoOrder, DemoAvailabilityError } from "./demo/createDemoOrder";
import { demoCart, type DemoCartScenario } from "./demo/demoCart";

const emptyData: CheckoutData = {
  fullName: "", email: "", phone: "", address: "", city: "", department: "",
};

export function CheckoutFlow() {
  const [data, setData] = useState<CheckoutData>(emptyData);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [order, setOrder] = useState<DemoOrder | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);
  const [scenario, setScenario] = useState<DemoCartScenario>("available");
  const [unavailableItemIds, setUnavailableItemIds] = useState<readonly string[]>([]);
  const items = scenario === "empty" ? [] : demoCart;
  const inFlight = useRef(false);

  function handleScenarioChange(next: DemoCartScenario) {
    if (inFlight.current || order) return;
    setScenario(next);
    setCreationError(null);
    setUnavailableItemIds([]);
  }
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const contentRef = useRef<HTMLDivElement>(null);
  const redirect = getCheckoutRedirect(pathname, data, paymentMethod, Boolean(order), isSubmitting);

  async function handleCreate(simulateFailure: boolean) {
    if (inFlight.current || order || !paymentMethod) return;
    inFlight.current = true;
    setIsSubmitting(true);
    setCreationError(null);
    setUnavailableItemIds([]);
    try {
      const created = await createDemoOrder(data, paymentMethod, items, simulateFailure, scenario === "unavailable" ? [demoCart[0].id] : []);
      setOrder(created);
      navigate("/checkout/summary", { replace: true });
    } catch (cause: unknown) {
      if (cause instanceof DemoAvailabilityError) setUnavailableItemIds(cause.itemIds);
      setCreationError(cause instanceof Error ? cause.message : "No se pudo crear el pedido de demostración.");
    } finally {
      inFlight.current = false;
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    contentRef.current?.querySelector<HTMLElement>("h1")?.focus();
  }, [pathname, order]);

  return (
    <>
      <CustomerHeader cartItemCount={items.reduce((count, item) => count + item.quantity, 0)} />
      <div ref={contentRef}>
        {redirect ? <Navigate to={redirect} replace /> : <Routes>
          <Route index element={<CheckoutDataPage formData={data} onChange={setData} onContinue={(normalizedData) => {
            setData(normalizedData);
            navigate("/checkout/payment");
          }} />} />
          <Route path="payment" element={
            <CheckoutPaymentPage method={paymentMethod} onChange={setPaymentMethod} onContinue={() => navigate("/checkout/summary")} />
          } />
          <Route path="summary" element={paymentMethod && (
            <CheckoutSummaryPage data={order?.customer ?? data} paymentMethod={order?.paymentMethod ?? paymentMethod}
              items={items} scenario={scenario} onScenarioChange={handleScenarioChange} unavailableItemIds={unavailableItemIds}
              order={order} isSubmitting={isSubmitting} error={creationError} onCreate={handleCreate} />
          )} />
        </Routes>}
      </div>
    </>
  );
}
