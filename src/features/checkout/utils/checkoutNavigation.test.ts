import assert from "node:assert/strict";
import test from "node:test";
import { getCheckoutRedirect } from "./checkoutNavigation.ts";

const valid = { fullName: "Karen Martínez", email: "karen@example.com", phone: "3001234567", address: "Calle 14 # 23 - 45", city: "Armenia", department: "Quindío" };
const empty = { fullName: "", email: "", phone: "", address: "", city: "", department: "" };

test("acceso directo sin borrador regresa al formulario", () => {
  for (const path of ["/checkout/payment", "/checkout/summary"]) assert.equal(getCheckoutRedirect(path, empty, false), "/checkout");
});

test("F-01 permite revisar con datos válidos sin método; selección de pago requiere pedido", () => {
  assert.equal(getCheckoutRedirect("/checkout/summary", valid, false), null);
  assert.equal(getCheckoutRedirect("/checkout/payment", valid, false), "/checkout/summary");
  assert.equal(getCheckoutRedirect("/checkout/payment", valid, true), null);
  assert.equal(getCheckoutRedirect("/checkout/summary", { ...valid, email: "incorrecto" }, false), "/checkout");
});

test("pedido creado impide editar; operación en curso obliga a esperar en resumen", () => {
  assert.equal(getCheckoutRedirect("/checkout", valid, false), null);
  assert.equal(getCheckoutRedirect("/checkout", valid, true), "/checkout/summary");
  for (const path of ["/checkout", "/checkout/payment", "/checkout/unknown"]) {
    assert.equal(getCheckoutRedirect(path, valid, false, true), "/checkout/summary");
  }
  assert.equal(getCheckoutRedirect("/checkout/summary", valid, false, true), null);
});

test("ruta desconocida vuelve al formulario o al pedido creado", () => {
  assert.equal(getCheckoutRedirect("/checkout/unknown", valid, false), "/checkout");
  assert.equal(getCheckoutRedirect("/checkout/unknown", valid, true), "/checkout/summary");
});
