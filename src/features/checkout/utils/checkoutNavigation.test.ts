import assert from "node:assert/strict";
import test from "node:test";
import { getCheckoutRedirect } from "./checkoutNavigation.ts";

const valid = { fullName: "Karen Martínez", email: "karen@example.com", phone: "3001234567", address: "Calle 14 # 23 - 45", city: "Armenia", department: "Quindío" };
const empty = { fullName: "", email: "", phone: "", address: "", city: "", department: "" };

test("acceso directo y recarga sin borrador regresan al formulario", () => {
  for (const path of ["/checkout/payment", "/checkout/summary"]) {
    assert.equal(getCheckoutRedirect(path, empty, null, false), "/checkout");
  }
  assert.equal(getCheckoutRedirect("/checkout", empty, null, false), null);
});

test("resumen requiere datos válidos y método; pago solo requiere datos", () => {
  assert.equal(getCheckoutRedirect("/checkout/payment", valid, null, false), null);
  assert.equal(getCheckoutRedirect("/checkout/summary", valid, null, false), "/checkout/payment");
  assert.equal(getCheckoutRedirect("/checkout/summary", valid, "card", false), null);
  assert.equal(getCheckoutRedirect("/checkout/summary", { ...valid, email: "incorrecto" }, "card", false), "/checkout");
});

test("se permite volver a editar un borrador, pero un pedido creado vuelve al resumen", () => {
  for (const path of ["/checkout", "/checkout/", "/checkout/payment"]) {
    assert.equal(getCheckoutRedirect(path, valid, "card", false), null);
    assert.equal(getCheckoutRedirect(path, valid, "card", true), "/checkout/summary");
  }
  assert.equal(getCheckoutRedirect("/checkout/summary", valid, "card", true), null);
});

test("una ruta desconocida vuelve a la etapa inicial o al pedido creado", () => {
  assert.equal(getCheckoutRedirect("/checkout/unknown", valid, "card", false), "/checkout");
  assert.equal(getCheckoutRedirect("/checkout/unknown", valid, "card", true), "/checkout/summary");
});

test("durante la creación no permite editar ni iniciar otra operación desde una etapa anterior", () => {
  for (const path of ["/checkout", "/checkout/payment", "/checkout/unknown"]) {
    assert.equal(getCheckoutRedirect(path, valid, "card", false, true), "/checkout/summary");
  }
  assert.equal(getCheckoutRedirect("/checkout/summary", valid, "card", false, true), null);
  assert.equal(getCheckoutRedirect("/checkout", valid, "card", false, false), null);
});
