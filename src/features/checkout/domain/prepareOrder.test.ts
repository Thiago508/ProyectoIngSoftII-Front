import assert from "node:assert/strict";
import test from "node:test";
import { prepareOrder } from "./prepareOrder.ts";
import { calculateSubtotal } from "./calculateSubtotal.ts";

const customer = { fullName: " Ana ", email: "ana@example.com", phone: "3001234567", address: "Calle 14 # 23 - 45", city: "Armenia", department: "Quindío" };
const items = [{ id: "1", name: "Camisa", size: "M", unitPrice: 100.25, quantity: 2 }];

test("prepara un snapshot independiente y normaliza los datos", () => {
  const draft = items.map(item => ({...item}));
  const prepared = prepareOrder(customer, draft);
  assert.equal(prepared.subtotal, 200.5);
  assert.equal(prepared.customer.fullName, "Ana");
  draft[0].quantity = 99;
  assert.equal(prepared.items[0].quantity, 2);
});

test("rechaza datos de comprador inválidos antes de validar el carrito", () => {
  assert.throws(() => prepareOrder({...customer, email: "invalido"}, []), /Revisa los datos de compra/);
});

test("calcula subtotales sin depender de la simulación", () => {
  assert.equal(calculateSubtotal(items), 200.5);
});
