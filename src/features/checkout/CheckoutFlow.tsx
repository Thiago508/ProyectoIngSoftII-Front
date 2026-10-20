import { useEffect, useRef, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { CustomerHeader } from "../../shared/components/CustomerHeader/CustomerHeader";
import { CheckoutDataPage } from "./pages/CheckoutDataPage";
import { CheckoutPaymentPage } from "./pages/CheckoutPaymentPage";
import { CheckoutSummaryPage } from "./pages/CheckoutSummaryPage";
import type { CheckoutData, CheckoutItem, DemoOrder, PaymentMethod, PaymentPreviewStatus } from "./types/checkout.types";
import { getCheckoutRedirect } from "./utils/checkoutNavigation";
import { createDemoOrder, DemoAvailabilityError } from "./demo/createDemoOrder";
import { demoCart, type DemoCartScenario } from "./demo/demoCart";

import type { CartLine } from "../cart/cart";
import type { Product } from "../products/demo/productsDemo";
import { prepareCheckoutCart } from "../cart/checkoutCart";

import { CheckoutPaymentResultPage } from "./pages/CheckoutPaymentResultPage";

import type { InventoryItem } from "../inventory/demo/inventoryDemo";

export function CheckoutFlow({ inventoryItems, lines, products, data, onDataChange, onDemoOrderCreated }: {
  inventoryItems: readonly InventoryItem[];
  lines: readonly CartLine[]; products: readonly Product[];
  data: CheckoutData; onDataChange: (data: CheckoutData) => void;
  onDemoOrderCreated: (order: DemoOrder) => void;
}) {
  const [demoMode] = useState(() => new URLSearchParams(window.location.search).get("demo") === "1");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [paymentPreview, setPaymentPreview] = useState<PaymentPreviewStatus>("pending");
  const [order, setOrder] = useState<DemoOrder | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);
  const [scenario, setScenario] = useState<DemoCartScenario>("available");
  const [unavailableItemIds, setUnavailableItemIds] = useState<readonly string[]>([]);
  let cartError: string | null = null;
  let selectedItems: readonly CheckoutItem[] = [];
  try { selectedItems = prepareCheckoutCart(lines, products, inventoryItems); }
  catch (cause: unknown) { cartError = cause instanceof Error ? cause.message : "Revisa el carrito."; }
  const items = demoMode ? (scenario === "empty" ? [] : demoCart) : selectedItems;
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
  const redirect = getCheckoutRedirect(pathname, data, Boolean(order), isSubmitting);

  async function handleCreate(simulateFailure: boolean) {
    if (inFlight.current || order || (!demoMode && (cartError || !items.length))) return;
    inFlight.current = true;
    setIsSubmitting(true);
    setCreationError(null);
    setUnavailableItemIds([]);
    try {
      const created = await createDemoOrder(data, items, simulateFailure, demoMode && scenario === "unavailable" ? [demoCart[0].id] : []);
      onDemoOrderCreated(created);
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
      <CustomerHeader cartItemCount={demoMode ? items.reduce((count, item) => count + item.quantity, 0) : lines.reduce((count, line) => count + line.quantity, 0)} cartTo={demoMode ? undefined : "/cart"} homeTo={demoMode ? undefined : "/catalog"} />
      <div ref={contentRef}>
        {redirect ? <Navigate to={redirect} replace /> : !demoMode && !order && (cartError || !items.length) ? <main className="checkout-page"><div className="checkout-page__container checkout-form"><h1 id="checkout-heading" tabIndex={-1}>Revisa tu carrito</h1><p role="alert">{cartError ?? "El carrito está vacío. Agrega productos antes de continuar."}</p><Link to="/cart">Volver al carrito</Link></div></main> : <Routes>
          <Route index element={<CheckoutDataPage formData={data} onChange={onDataChange} onContinue={(normalizedData) => {
            onDataChange(normalizedData);
            navigate("/checkout/summary");
          }} />} />
          <Route path="payment" element={
            <CheckoutPaymentPage order={order} method={paymentMethod} onChange={setPaymentMethod} onContinue={() => navigate("/checkout/summary")} />
          } />
          <Route path="payment/result" element={order ? <CheckoutPaymentResultPage order={order} status={paymentPreview} onStatusChange={setPaymentPreview} /> : <Navigate to="/checkout/summary" replace />} />
          <Route path="summary" element={(
            <CheckoutSummaryPage data={order?.customer ?? data} paymentMethod={paymentMethod}
              items={items} demoMode={demoMode} scenario={scenario} onScenarioChange={handleScenarioChange} unavailableItemIds={unavailableItemIds}
              order={order} isSubmitting={isSubmitting} error={creationError} onCreate={handleCreate} />
          )} />
        </Routes>}
      </div>
    </>
  );
}
