import { useEffect, useRef, type FormEvent } from 'react';
import type { OrderShipping, ShippingErrors } from '../../orders/orderShipping';
const fields = ['address', 'phone', 'city', 'department'] as const;
const labels = { address: 'Dirección de envío', phone: 'Teléfono de envío', city: 'Ciudad de envío', department: 'Departamento de envío' };
export function OrderShippingForm({ value, errors, disabled, onChange, onSubmit }: { value: OrderShipping; errors: ShippingErrors; disabled: boolean; onChange: (value: OrderShipping) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { if (!disabled) { const field = fields.find((field) => errors[field]); if (field) form.current?.querySelector<HTMLInputElement>(`[name="${field}"]`)?.focus(); } }, [errors, disabled]);
  return <form id="order-shipping-form" ref={form} className="order-detail__lookup" onSubmit={onSubmit} noValidate>
    {fields.map((field) => <div key={field} className="order-shipping__field"><label htmlFor={`order-shipping-${field}`}>{labels[field]}</label><input id={`order-shipping-${field}`} name={field} type={field === 'phone' ? 'tel' : 'text'} autoComplete={{ address: 'street-address', phone: 'tel', city: 'address-level2', department: 'address-level1' }[field]} required disabled={disabled} value={value[field]} aria-invalid={Boolean(errors[field])} aria-describedby={errors[field] ? `order-shipping-${field}-error` : field === 'phone' ? 'order-shipping-phone-help' : undefined} onChange={(event) => onChange({ ...value, [field]: event.currentTarget.value })} />{errors[field] && <p id={`order-shipping-${field}-error`} className="order-detail__error">{errors[field]}</p>}</div>)}
    <p id="order-shipping-phone-help">Teléfono de 7 a 32 caracteres; admite números, +, paréntesis, espacios y guiones.</p>
  </form>;
}
