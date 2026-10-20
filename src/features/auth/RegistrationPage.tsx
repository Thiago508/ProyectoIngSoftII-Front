import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { CustomerHeader } from '../../shared/components/CustomerHeader/CustomerHeader';
import { validateRegistration, type RegistrationData, type RegistrationErrors } from './registration';
import './AuthPage.css';

const empty: RegistrationData = { email: '', password: '', confirmation: '' };

export function RegistrationPage({ cartCount }: { cartCount: number }) {
  const [data, setData] = useState<RegistrationData>(empty);
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [validated, setValidated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
    const previousTitle = document.title;
    document.title = 'Registro de cliente | Fashion Online Store';
    return () => { document.title = previousTitle; };
  }, []);

  function update(field: keyof RegistrationData, value: string) {
    setData((previous) => ({ ...previous, [field]: value }));
    setValidated(false);
    setErrors((previous) => ({ ...previous, [field]: undefined, ...(field === 'password' ? { confirmation: undefined } : {}) }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateRegistration(data);
    setErrors(nextErrors);
    setValidated(false);
    const first = (['email', 'password', 'confirmation'] as const).find((field) => nextErrors[field]);
    if (first) {
      formRef.current?.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus();
      return;
    }
    // No se almacena una cuenta, no se transmite la contraseña ni se inicia sesión.
    setData({ email: data.email.trim(), password: '', confirmation: '' });
    setShowPassword(false);
    setValidated(true);
  }

  return <>
    <CustomerHeader cartItemCount={cartCount} cartTo="/cart" homeTo="/catalog" contentHeadingId="registration-heading" skipLabel="Saltar al registro" />
    <main className="auth-page">
      <div className="auth-page__panel">
        <h1 id="registration-heading" ref={headingRef} tabIndex={-1}>Registro de cliente</h1>
        <p>Formulario de demostración. No crea cuentas ni inicia sesión.</p>
        <p>El registro público corresponde a clientes. La validación definitiva y la comprobación de un correo único se realizarán en el servidor.</p>
        <form ref={formRef} onSubmit={submit} noValidate>
          <div className="auth-page__field">
            <label htmlFor="registration-email">Correo electrónico</label>
            <input id="registration-email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required value={data.email} onChange={(event) => update('email', event.currentTarget.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'registration-email-error' : undefined} />
            {errors.email && <p id="registration-email-error" className="auth-page__error">{errors.email}</p>}
          </div>
          <div className="auth-page__field">
            <label htmlFor="registration-password">Contraseña</label>
            <input id="registration-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" autoCapitalize="none" spellCheck={false} required value={data.password} onChange={(event) => update('password', event.currentTarget.value)} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'registration-password-error' : undefined} />
            {errors.password && <p id="registration-password-error" className="auth-page__error">{errors.password}</p>}
          </div>
          <div className="auth-page__field">
            <label htmlFor="registration-confirmation">Confirmar contraseña</label>
            <input id="registration-confirmation" name="confirmation" type={showPassword ? 'text' : 'password'} autoComplete="new-password" autoCapitalize="none" spellCheck={false} required value={data.confirmation} onChange={(event) => update('confirmation', event.currentTarget.value)} aria-invalid={Boolean(errors.confirmation)} aria-describedby={errors.confirmation ? 'registration-confirmation-error' : undefined} />
            {errors.confirmation && <p id="registration-confirmation-error" className="auth-page__error">{errors.confirmation}</p>}
          </div>
          <label className="auth-page__visibility"><input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.currentTarget.checked)} /> Mostrar contraseñas</label>
          <button type="submit">Validar registro (demostración)</button>
          <p role="status" aria-atomic="true">{validated ? 'Datos válidos para la demostración. No se creó una cuenta ni se inició sesión. Las contraseñas se limpiaron del formulario.' : ''}</p>
        </form>
        <p>¿Ya tienes una cuenta? <Link to="/login">Ir al inicio de sesión</Link></p>
        <Link to="/catalog">Volver al catálogo</Link>
      </div>
    </main>
  </>;
}
