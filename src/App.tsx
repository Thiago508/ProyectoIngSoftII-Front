import { addCartItem, updateCartQuantity, removeCartItem, type CartLine } from "./features/cart/cart";
import { CartPage } from "./features/cart/pages/CartPage";
import { useState } from "react";
import { CatalogPage } from "./features/catalog/pages/CatalogPage";
import { productsDemo, type Product } from "./features/products/demo/productsDemo";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProductsPage } from "./features/products/pages/ProductsPage";
import { InventoryPage } from "./features/inventory/pages/InventoryPage";
import { CheckoutFlow } from "./features/checkout/CheckoutFlow";

import { RegistrationPage } from "./features/auth/RegistrationPage";

import { LoginPage } from "./features/auth/LoginPage";

import { NotificationsPage } from "./features/notifications/NotificationsPage";

import type { DemoNotification } from "./features/notifications/notificationsDemo";
import { recordRegisteredNotification } from "./features/notifications/recordRegisteredNotification";

import { OrderDetailPage } from "./features/orders/OrderDetailPage";
import type { CheckoutData, DemoOrder } from "./features/checkout/types/checkout.types";

import { createDemoInventorySession } from "./features/inventory/demo/inventorySession";

function emptyCheckoutData(): CheckoutData {
  return { fullName: "", email: "", phone: "", address: "", city: "", department: "" };
}

function App() {
  const [inventory, setInventory] = useState(createDemoInventorySession);
  const [products, setProducts] = useState<Product[]>(() => productsDemo.map((product) => ({ ...product })));
  const [orderSession, setOrderSession] = useState<{ orders: readonly DemoOrder[]; notifications: readonly DemoNotification[] }>({ orders: [], notifications: [] });
  const { orders, notifications } = orderSession;
  const [checkoutDraft, setCheckoutDraft] = useState<CheckoutData>(emptyCheckoutData);
  const [cart, setCart] = useState<CartLine[]>([]);
  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  function handleAddToCart(productId: string, sku: string, quantity: string) {
    const result = addCartItem(products, cart, productId, sku, quantity, inventory.items);
    if (result.ok) setCart(result.lines);
    return { ok: result.ok, message: result.message };
  }
  function handleUpdateCart(productId: string, sku: string, quantity: string) {
    const result = updateCartQuantity(products, cart, productId, sku, quantity);
    if (result.ok) setCart(result.lines);
    return { ok: result.ok, message: result.message };
  }
  function handleRemoveCart(productId: string, sku: string) {
    const result = removeCartItem(cart, productId, sku);
    if (result.ok) setCart(result.lines);
    return { ok: result.ok, message: result.message };
  }
  function handleDemoOrderCreated(order: DemoOrder) {
    setCheckoutDraft(emptyCheckoutData());
    const snapshot = { ...order, customer: { ...order.customer }, items: order.items.map((item) => ({ ...item })) };
    setOrderSession((previous) => ({
      orders: previous.orders.some((saved) => saved.id === order.id) ? previous.orders : [snapshot, ...previous.orders],
      notifications: recordRegisteredNotification(previous.notifications, order.id, order.createdAt),
    }));
  }
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/orders/:orderId" element={<OrderDetailPage orders={orders} cartCount={cartCount} />} />
        <Route path="/notifications" element={<NotificationsPage cartCount={cartCount} sessionNotices={notifications} availableOrderIds={orders.map((order) => order.id)} />} />
        <Route path="/login" element={<LoginPage cartCount={cartCount} />} />
        <Route path="/register" element={<RegistrationPage cartCount={cartCount} />} />
        <Route path="/cart" element={<CartPage lines={cart} products={products} onUpdate={handleUpdateCart} onRemove={handleRemoveCart} />} />
        <Route path="/" element={<Navigate to="/catalog" replace />} />
        <Route path="/catalog" element={<CatalogPage inventoryItems={inventory.items} products={products} cartCount={cartCount} onAddToCart={handleAddToCart} />} />
        <Route path="/catalog/:productId" element={<CatalogPage inventoryItems={inventory.items} products={products} cartCount={cartCount} onAddToCart={handleAddToCart} />} />
        <Route path="/admin/products" element={<ProductsPage products={products} onProductsChange={setProducts} />} />
        <Route path="/admin/inventory" element={<InventoryPage inventory={inventory} onInventoryChange={setInventory} />} />
        <Route path="/checkout/*" element={<CheckoutFlow inventoryItems={inventory.items} lines={cart} products={products} data={checkoutDraft} onDataChange={setCheckoutDraft} onDemoOrderCreated={handleDemoOrderCreated} />} />
        <Route path="*" element={<Navigate to="/checkout" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
