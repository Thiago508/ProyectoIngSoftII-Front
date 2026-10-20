import { useState } from "react";
import { CatalogPage } from "./features/catalog/pages/CatalogPage";
import { productsDemo, type Product } from "./features/products/demo/productsDemo";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProductsPage } from "./features/products/pages/ProductsPage";
import { InventoryPage } from "./features/inventory/pages/InventoryPage";
import { CheckoutFlow } from "./features/checkout/CheckoutFlow";

function App() {
  const [products, setProducts] = useState<Product[]>(() => productsDemo.map((product) => ({ ...product })));
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/catalog" replace />} />
        <Route path="/catalog" element={<CatalogPage products={products} />} />
        <Route path="/catalog/:productId" element={<CatalogPage products={products} />} />
        <Route path="/admin/products" element={<ProductsPage products={products} onProductsChange={setProducts} />} />
        <Route path="/admin/inventory" element={<InventoryPage />} />
        <Route path="/checkout/*" element={<CheckoutFlow />} />
        <Route path="*" element={<Navigate to="/checkout" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
