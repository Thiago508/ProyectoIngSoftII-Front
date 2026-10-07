import {
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import { CheckoutStepper } from "../components/CheckoutStepper/CheckoutStepper";
import type {
  CheckoutData,
  CheckoutErrors,
} from "../types/checkout.types";

import { isCheckoutField, normalizeCheckoutData, validateCheckoutData } from "../utils/checkoutValidation";

import "./CheckoutDataPage.css";

interface CheckoutDataPageProps {
  formData: CheckoutData;
  onChange: (data: CheckoutData) => void;
  onContinue: (data: CheckoutData) => void;
}

export function CheckoutDataPage({ formData, onChange, onContinue }: CheckoutDataPageProps) {
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const formRef = useRef<HTMLFormElement>(null);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.currentTarget;
    if (!isCheckoutField(name)) return;
    onChange({ ...formData, [name]: value });
    setErrors((previous) => ({ ...previous, [name]: undefined }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedData = normalizeCheckoutData(formData);
    const nextErrors = validateCheckoutData(normalizedData);
    onChange(normalizedData);
    setErrors(nextErrors);

    const firstInvalidField = Object.keys(nextErrors)[0];
    if (firstInvalidField) {
      formRef.current?.querySelector<HTMLInputElement>(`[name="${firstInvalidField}"]`)?.focus();
      return;
    }

    onContinue(normalizedData);
  }

  return (
    <main className="checkout-page">
      <div className="checkout-page__container">
        <CheckoutStepper currentStep="data" />

        <form
          className="checkout-form"
          onSubmit={handleSubmit}
          ref={formRef}
          noValidate
        >
          <section className="checkout-form__section">
            <h1 id="checkout-heading" tabIndex={-1}>Datos personales</h1>

            <div className="checkout-form__field">
              <label htmlFor="fullName">
                Nombre completo
              </label>

              <input
                id="fullName"
                name="fullName"
                type="text"
                value={formData.fullName}
                onChange={handleChange}
                autoComplete="name"
                aria-invalid={Boolean(errors.fullName)}
                aria-describedby={errors.fullName ? "fullName-error" : undefined}
                required
              />
              {errors.fullName && <p className="checkout-form__error" id="fullName-error">{errors.fullName}</p>}
            </div>

            <div className="checkout-form__field">
              <label htmlFor="email">
                Correo electrónico
              </label>

              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "email-error" : undefined}
                required
              />
              {errors.email && <p className="checkout-form__error" id="email-error">{errors.email}</p>}
            </div>

            <div className="checkout-form__field">
              <label htmlFor="phone">
                Teléfono
              </label>

              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                autoComplete="tel"
                aria-invalid={Boolean(errors.phone)}
                aria-describedby={errors.phone ? "phone-error" : undefined}
                required
              />
              {errors.phone && <p className="checkout-form__error" id="phone-error">{errors.phone}</p>}
            </div>
          </section>

          <section className="checkout-form__section">
            <h2>Dirección de envío</h2>

            <div className="checkout-form__field">
              <label htmlFor="address">
                Dirección
              </label>

              <input
                id="address"
                name="address"
                type="text"
                value={formData.address}
                onChange={handleChange}
                autoComplete="street-address"
                aria-invalid={Boolean(errors.address)}
                aria-describedby={errors.address ? "address-error" : undefined}
                required
              />
              {errors.address && <p className="checkout-form__error" id="address-error">{errors.address}</p>}
            </div>

            <div className="checkout-form__field">
              <label htmlFor="city">
                Ciudad
              </label>

              <input
                id="city"
                name="city"
                type="text"
                value={formData.city}
                onChange={handleChange}
                autoComplete="address-level2"
                aria-invalid={Boolean(errors.city)}
                aria-describedby={errors.city ? "city-error" : undefined}
                required
              />
              {errors.city && <p className="checkout-form__error" id="city-error">{errors.city}</p>}
            </div>

            <div className="checkout-form__field">
              <label htmlFor="department">
                Departamento
              </label>

              <input
                id="department"
                name="department"
                type="text"
                value={formData.department}
                onChange={handleChange}
                autoComplete="address-level1"
                aria-invalid={Boolean(errors.department)}
                aria-describedby={errors.department ? "department-error" : undefined}
                required
              />
              {errors.department && <p className="checkout-form__error" id="department-error">{errors.department}</p>}
            </div>
          </section>

          <button
            className="checkout-form__submit"
            type="submit"
          >
            Continuar
          </button>
        </form>
      </div>
    </main>
  );
}