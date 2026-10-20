import { addCartItem, type CartLine } from "./features/cart/cart";
import { CartPage } from "./features/cart/pages/CartPage";
import { useState } from "react";
import { CatalogPage } from "./features/catalog/pages/CatalogPage";
import { productsDemo, type Product } from "./features/products/demo/productsDemo";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProductsPage } from "./features/products/pages/ProductsPage";
import { InventoryPage } from "./features/inventory/pages/InventoryPage";
import { CheckoutFlow } from "./features/checkout/CheckoutFlow";

function App() {
  const [products, setProducts] = useState<Product[]>(() => productsDemo.map((product) => ({ ...product })));
  const [cart, setCart] = useState<CartLine[]>([]);
  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  function handleAddToCart(productId: string, sku: string, quantity: string) {
    const result = addCartItem(products, cart, productId, sku, quantity);
    if (result.ok) setCart(result.lines);
    return { ok: result.ok, message: result.message };
  }
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/cart" element={<CartPage lines={cart} products={products} />} />
        <Route path="/" element={<Navigate to="/catalog" replace />} />
        <Route path="/catalog" element={<CatalogPage products={products} cartCount={cartCount} onAddToCart={handleAddToCart} />} />
        <Route path="/catalog/:productId" element={<CatalogPage products={products} cartCount={cartCount} onAddToCart={handleAddToCart} />} />
        <Route path="/admin/products" element={<ProductsPage products={products} onProductsChange={setProducts} />} />
        <Route path="/admin/inventory" element={<InventoryPage />} />
        <Route path="/checkout/*" element={<CheckoutFlow />} />
        <Route path="*" element={<Navigate to="/checkout" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
