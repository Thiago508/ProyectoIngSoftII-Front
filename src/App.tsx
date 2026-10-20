import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProductsPage } from "./features/products/pages/ProductsPage";
import { InventoryPage } from "./features/inventory/pages/InventoryPage";
import { CheckoutFlow } from "./features/checkout/CheckoutFlow";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/products" element={<ProductsPage />} />
        <Route path="/admin/inventory" element={<InventoryPage />} />
        <Route path="/checkout/*" element={<CheckoutFlow />} />
        <Route path="*" element={<Navigate to="/checkout" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
