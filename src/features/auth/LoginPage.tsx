import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { adminReturnPath } from './adminNavigation';
import { CustomerHeader } from '../../shared/components/CustomerHeader/CustomerHeader';
import { createApiClient } from '../../shared/api/apiClient';
import { getApiBaseUrl } from '../../shared/api/apiConfig';
import { validateCredentials, type Credentials, type CredentialsErrors } from './credentials';
import { authFieldErrors, loginWithApi } from './authApi';
import { useAuth } from './AuthContext';
import './AuthPage.css';

const fields = ['email', 'password'] as const;
export function LoginPage({ cartCount }: { cartCount: number }) {
  const auth = useAuth();
  const returnTo = adminReturnPath(useLocation().state);
  const [data, setData] = useState<Credentials>({ email: '', password: '' });
  const [errors, setErrors] = useState<CredentialsErrors>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const pending = useRef<AbortController | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
    const previousTitle = document.title;
    document.title = 'Inicio de sesión | Fashion Online Store';
    return () => { pending.current?.abort(); document.title = previousTitle; };
  }, []);
  useEffect(() => {
    if (!error || busy) return;
    const field = fields.find((key) => errors[key]);
    const input = field ? formRef.current?.querySelector<HTMLInputElement>(`[name="${field}"]`) : null;
    (input ?? errorRef.current)?.focus();
  }, [error, errors, busy]);

  function update(field: keyof Credentials, value: string) {
    setData((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
    setError('');
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || auth.session) return;
    const nextErrors = validateCredentials(data);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { setError('Revisa los campos del formulario.'); return; }
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError('');
    let signedIn = false;
    try {
      const session = await loginWithApi(createApiClient(getApiBaseUrl()), data, controller.signal);
      if (!controller.signal.aborted) { auth.signIn(session); signedIn = true; }
    } catch (cause: unknown) {
      if (!controller.signal.aborted) {
        setErrors(authFieldErrors(cause, fields));
        setError(cause instanceof Error ? cause.message : 'No se pudo iniciar sesión.');
      }
    } finally {
      if (pending.current === controller) pending.current = null;
      if (!controller.signal.aborted) {
        setBusy(false);
        setShowPassword(false);
        setData((previous) => ({ email: signedIn ? '' : previous.email.trim(), password: '' }));
      }
    }
  }

  if (auth.session && returnTo) return <Navigate to={returnTo} replace />;

  return <>
    <CustomerHeader cartItemCount={cartCount} cartTo="/cart" homeTo="/catalog" contentHeadingId="login-heading" skipLabel="Saltar al inicio de sesión" />
    <main className="auth-page">
      <div className="auth-page__panel">
        <h1 id="login-heading" ref={headingRef} tabIndex={-1}>Inicio de sesión</h1>
        <p>Accede con tu cuenta del backend. La sesión se conserva en memoria y se pierde al recargar.</p>
        {!auth.session && returnTo && <p>Inicia sesión con una cuenta administrativa para continuar.</p>}
        {!auth.session && <form ref={formRef} onSubmit={(event) => { void submit(event); }} noValidate aria-busy={busy}>
          <div className="auth-page__field">
            <label htmlFor="login-email">Correo electrónico</label>
            <input id="login-email" name="email" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} required disabled={busy} value={data.email} onChange={(event) => update('email', event.currentTarget.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'login-email-error' : undefined} />
            {errors.email && <p id="login-email-error" className="auth-page__error">{errors.email}</p>}
          </div>
          <div className="auth-page__field">
            <label htmlFor="login-password">Contraseña</label>
            <input id="login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" autoCapitalize="none" spellCheck={false} required disabled={busy} value={data.password} onChange={(event) => update('password', event.currentTarget.value)} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'login-password-error' : undefined} />
            {errors.password && <p id="login-password-error" className="auth-page__error">{errors.password}</p>}
          </div>
          <label className="auth-page__visibility"><input type="checkbox" disabled={busy} checked={showPassword} onChange={(event) => setShowPassword(event.currentTarget.checked)} /> Mostrar contraseña</label>
          <button type="submit" disabled={busy}>{busy ? 'Iniciando sesión…' : 'Iniciar sesión'}</button>
        </form>}
        {error && <p ref={errorRef} tabIndex={-1} className="auth-page__error" role="alert">{error}</p>}
        <p role="status" aria-atomic="true">{busy ? 'Verificando acceso con el servidor…' : auth.session ? `Sesión iniciada como ${auth.session.user.name}.` : ''}</p>
        {!auth.session && <p>¿No tienes una cuenta? <Link to="/register">Ir al registro</Link></p>}
        <Link to="/catalog">Volver al catálogo</Link>
      </div>
    </main>
  </>;
}
