import assert from "node:assert/strict";
import test from "node:test";
import { calculateSubtotal, createDemoOrder, DemoAvailabilityError } from "./createDemoOrder.ts";
import { demoCart } from "./demoCart.ts";

const customer = { fullName: " Karen Martínez ", email: "karen@example.com", phone: "3001234567", address: "Calle 14 # 23 - 45", city: "Armenia", department: "Quindío" };

test("calcula el subtotal del mockup y multiplica cantidades", () => {
  assert.equal(calculateSubtotal(demoCart), 219700);
  assert.equal(calculateSubtotal([{ ...demoCart[0], quantity: 2 }]), 179800);
  for (const quantity of [0, -1, 1.5, NaN]) assert.throws(() => calculateSubtotal([{ ...demoCart[0], quantity }]));
  assert.throws(() => calculateSubtotal([]));
  assert.throws(() => calculateSubtotal([{ ...demoCart[0], unitPrice: -1 }]));
});

test("crea una copia pendiente de pago sin mutar el carrito ni datos personales", async () => {
  const items = demoCart.map((item) => ({ ...item }));
  const original = structuredClone(items);
  const order = await createDemoOrder(customer, items);
  assert.equal(order.status, "pending_payment");
  assert.equal("paymentMethod" in order, false);
  assert.equal(order.subtotal, 219700);
  assert.match(order.id, /^DEMO-/);
  assert.equal(order.customer.fullName, "Karen Martínez");
  assert.equal(customer.fullName, " Karen Martínez ");
  assert.deepEqual(items, original);
  items[0].quantity = 99;
  assert.equal(order.items[0].quantity, 1);
});

test("permite simular un fallo y reintentar", async () => {
  await assert.rejects(createDemoOrder(customer, demoCart, true), /No se pudo crear/);
  assert.equal((await createDemoOrder(customer, demoCart)).status, "pending_payment");
});

test("rechaza datos inválidos antes de crear un pedido", async () => {
  await assert.rejects(createDemoOrder({ ...customer, email: "incorrecto" }, demoCart), /Revisa los datos/);
});

test("SWR-01 rechaza un carrito vacío sin crear un pedido", async () => {
  await assert.rejects(createDemoOrder(customer, []), /El carrito está vacío/);
});

test("SWR-02 simula rechazo de disponibilidad y conserva los artículos originales", async () => {
  const original = structuredClone(demoCart);
  await assert.rejects(createDemoOrder(customer, demoCart, false, [demoCart[0].id]), (cause: unknown) => {
    assert.ok(cause instanceof DemoAvailabilityError);
    assert.deepEqual(cause.itemIds, [demoCart[0].id]);
    return true;
  });
  assert.deepEqual(demoCart, original);
  const order = await createDemoOrder(customer, demoCart);
  assert.equal(order.status, "pending_payment");
  assert.equal(order.subtotal, 219700);
});

test("SWR-04 y SWR-14 conservan nombre, precio y datos del pedido separados del borrador", async () => {
  const draftCustomer = { ...customer };
  const draftItems = demoCart.map((item) => ({ ...item }));
  const originalName = draftItems[0].name;
  const originalPrice = draftItems[0].unitPrice;
  const pending = createDemoOrder(draftCustomer, draftItems);
  draftCustomer.address = "Otra dirección";
  draftItems[0].name = "Producto modificado";
  draftItems[0].unitPrice = 1;
  const order = await pending;
  assert.equal(order.customer.address, customer.address.trim());
  assert.equal(order.items[0].name, originalName);
  assert.equal(order.items[0].unitPrice, originalPrice);
  assert.equal(order.subtotal, 219700);
});
