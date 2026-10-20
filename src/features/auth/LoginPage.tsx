import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { CustomerHeader } from '../../shared/components/CustomerHeader/CustomerHeader';
import { validateCredentials, type Credentials, type CredentialsErrors } from './credentials';
import './AuthPage.css';

export function LoginPage({ cartCount }: { cartCount: number }) {
  const [data, setData] = useState<Credentials>({ email: '', password: '' });
  const [errors, setErrors] = useState<CredentialsErrors>({});
  const [validated, setValidated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
    const previousTitle = document.title;
    document.title = 'Inicio de sesión | Fashion Online Store';
    return () => { document.title = previousTitle; };
  }, []);

  function update(field: keyof Credentials, value: string) {
    setData((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
    setValidated(false);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateCredentials(data);
    setErrors(nextErrors);
    setValidated(false);
    const first = (['email', 'password'] as const).find((field) => nextErrors[field]);
    if (first) {
      formRef.current?.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus();
      return;
    }
    // Validación local explícita: no autentica, emite tokens ni guarda credenciales.
    setData({ email: data.email.trim(), password: '' });
    setShowPassword(false);
    setValidated(true);
  }

  return <>
    <CustomerHeader cartItemCount={cartCount} cartTo="/cart" homeTo="/catalog" contentHeadingId="login-heading" skipLabel="Saltar al inicio de sesión" />
    <main className="auth-page">
      <div className="auth-page__panel">
        <h1 id="login-heading" ref={headingRef} tabIndex={-1}>Inicio de sesión</h1>
        <p>Formulario de demostración. No autentica cuentas ni inicia sesión.</p>
        <form ref={formRef} onSubmit={submit} noValidate>
          <div className="auth-page__field">
            <label htmlFor="login-email">Correo electrónico</label>
            <input id="login-email" name="email" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} required value={data.email} onChange={(event) => update('email', event.currentTarget.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'login-email-error' : undefined} />
            {errors.email && <p id="login-email-error" className="auth-page__error">{errors.email}</p>}
          </div>
          <div className="auth-page__field">
            <label htmlFor="login-password">Contraseña</label>
            <input id="login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" autoCapitalize="none" spellCheck={false} required value={data.password} onChange={(event) => update('password', event.currentTarget.value)} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'login-password-error' : undefined} />
            {errors.password && <p id="login-password-error" className="auth-page__error">{errors.password}</p>}
          </div>
          <label className="auth-page__visibility"><input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.currentTarget.checked)} /> Mostrar contraseña</label>
          <button type="submit">Validar acceso (demostración)</button>
          <p role="status" aria-atomic="true">{validated ? 'Formato válido para la demostración. No se verificaron las credenciales ni se inició sesión. La contraseña se limpió del formulario.' : ''}</p>
        </form>
        <p>¿No tienes una cuenta? <Link to="/register">Ir al registro</Link></p>
        <Link to="/catalog">Volver al catálogo</Link>
      </div>
    </main>
  </>;
}
