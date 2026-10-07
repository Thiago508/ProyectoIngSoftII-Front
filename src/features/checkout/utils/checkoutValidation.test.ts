import assert from "node:assert/strict";
import test from "node:test";
import { isCheckoutField, normalizeCheckoutData, validateCheckoutData } from "./checkoutValidation.ts";

const validData = {
  fullName: " Karen Martínez ", email: " karen@example.com ", phone: "300 123 4567",
  address: " Calle 14 # 23 - 45 ", city: " Armenia ", department: " Quindío ",
};

test("normaliza sin mutar el borrador y acepta datos válidos", () => {
  const normalized = normalizeCheckoutData(validData);
  assert.equal(normalized.fullName, "Karen Martínez");
  assert.equal(normalized.email, "karen@example.com");
  assert.equal(normalized.phone, "3001234567");
  assert.equal(normalized.address, "Calle 14 # 23 - 45");
  assert.equal(normalized.city, "Armenia");
  assert.equal(normalized.department, "Quindío");
  assert.equal(validData.fullName, " Karen Martínez ");
  assert.deepEqual(validateCheckoutData(validData), {});
});

test("detecta los seis campos vacíos aunque contengan espacios", () => {
  const errors = validateCheckoutData({ fullName: "  ", email: "", phone: " ", address: "", city: " ", department: "" });
  assert.deepEqual(Object.keys(errors), ["fullName", "email", "phone", "address", "city", "department"]);
});

test("comprueba límites del nombre, dirección y teléfono", () => {
  for (const phone of ["123456", "12345678901", "+573001234567", "123-4567", "abcdefg"]) {
    assert.ok(validateCheckoutData({ ...validData, phone }).phone);
  }
  for (const phone of ["1234567", "1234567890"]) {
    assert.equal(validateCheckoutData({ ...validData, phone }).phone, undefined);
  }
  assert.ok(validateCheckoutData({ ...validData, fullName: " ab " }).fullName);
  assert.ok(validateCheckoutData({ ...validData, address: "1234" }).address);
  assert.deepEqual(validateCheckoutData({ ...validData, fullName: "abc", address: "12345" }), {});
});

test("rechaza correos mal formados y permite corregir los errores", () => {
  for (const email of ["karen", "karen@", "karen@example", "ka ren@example.com"]) {
    assert.ok(validateCheckoutData({ ...validData, email }).email);
  }
  assert.deepEqual(validateCheckoutData(validData), {});
});

test("solo acepta nombres de campo del modelo", () => {
  assert.equal(isCheckoutField("email"), true);
  for (const name of ["__proto__", "constructor", "unknown", ""]) assert.equal(isCheckoutField(name), false);
});
