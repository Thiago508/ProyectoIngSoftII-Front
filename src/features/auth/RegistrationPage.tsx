import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { CustomerHeader } from '../../shared/components/CustomerHeader/CustomerHeader';
import { ApiError, createApiClient } from '../../shared/api/apiClient';
import { getApiBaseUrl } from '../../shared/api/apiConfig';
import { validateRegistration, type RegistrationData, type RegistrationErrors } from './registration';
import { authFieldErrors, registerWithApi, RegistrationAcceptedError } from './authApi';
import { useAuth } from './AuthContext';
import './AuthPage.css';

const empty: RegistrationData = { name: '', email: '', password: '', confirmation: '' };
const fields = ['name', 'email', 'password', 'confirmation'] as const;
const labels = { name: 'Nombre completo', email: 'Correo electrónico', password: 'Contraseña', confirmation: 'Confirmar contraseña' };
const autocomplete = { name: 'name', email: 'email', password: 'new-password', confirmation: 'new-password' };

export function RegistrationPage({ cartCount }: { cartCount: number }) {
  const auth = useAuth();
  const [data, setData] = useState<RegistrationData>(empty);
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [error, setError] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const pending = useRef<AbortController | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
    const previousTitle = document.title;
    document.title = 'Registro de cliente | Fashion Online Store';
    return () => { pending.current?.abort(); document.title = previousTitle; };
  }, []);
  useEffect(() => {
    if (!error || busy) return;
    const field = fields.find((key) => errors[key]);
    const input = field ? formRef.current?.querySelector<HTMLInputElement>(`[name="${field}"]`) : null;
    (input ?? errorRef.current)?.focus();
  }, [error, errors, busy]);

  function update(field: keyof RegistrationData, value: string) {
    setData((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined, ...(field === 'password' ? { confirmation: undefined } : {}) }));
    setError('');
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || auth.session || accepted) return;
    const nextErrors = validateRegistration(data);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { setError('Revisa los campos del formulario.'); return; }
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError('');
    let registered = false;
    try {
      const session = await registerWithApi(createApiClient(getApiBaseUrl()), data, controller.signal);
      if (!controller.signal.aborted) { auth.signIn(session); setCompleted(true); registered = true; }
    } catch (cause: unknown) {
      if (!controller.signal.aborted) {
        setErrors(authFieldErrors(cause, fields));
        if (cause instanceof RegistrationAcceptedError) { setAccepted(true); registered = true; }
        setError(cause instanceof ApiError && (cause.kind === 'network' || cause.kind === 'timeout')
          ? 'No se pudo confirmar el registro. Si la cuenta se creó, intenta iniciar sesión antes de repetirlo.'
          : cause instanceof Error ? cause.message : 'No se pudo registrar la cuenta.');
      }
    } finally {
      if (pending.current === controller) pending.current = null;
      if (!controller.signal.aborted) {
        setBusy(false);
        setShowPassword(false);
        setData((previous) => registered ? empty : ({ name: previous.name.trim(), email: previous.email.trim(), password: '', confirmation: '' }));
      }
    }
  }

  return <>
    <CustomerHeader cartItemCount={cartCount} cartTo="/cart" homeTo="/catalog" contentHeadingId="registration-heading" skipLabel="Saltar al registro" />
    <main className="auth-page">
      <div className="auth-page__panel">
        <h1 id="registration-heading" ref={headingRef} tabIndex={-1}>Registro de cliente</h1>
        <p>Crea tu cuenta de cliente. El servidor asigna el rol y comprueba que el correo sea único.</p>
        {!auth.session && !accepted && <form ref={formRef} onSubmit={(event) => { void submit(event); }} noValidate aria-busy={busy}>
          {fields.map((field) => <div className="auth-page__field" key={field}>
            <label htmlFor={`registration-${field}`}>{labels[field]}</label>
            <input id={`registration-${field}`} name={field} type={field === 'password' || field === 'confirmation' ? showPassword ? 'text' : 'password' : field === 'email' ? 'email' : 'text'} autoComplete={autocomplete[field]} autoCapitalize={field === 'name' ? 'words' : 'none'} spellCheck={false} required disabled={busy} value={data[field]} onChange={(event) => update(field, event.currentTarget.value)} aria-invalid={Boolean(errors[field])} aria-describedby={[field === 'password' ? 'registration-password-help' : '', errors[field] ? `registration-${field}-error` : ''].filter(Boolean).join(' ') || undefined} />
            {field === 'password' && <p id="registration-password-help">Entre 6 y 80 caracteres. Los espacios forman parte de tu contraseña.</p>}
            {errors[field] && <p id={`registration-${field}-error`} className="auth-page__error">{errors[field]}</p>}
          </div>)}
          <label className="auth-page__visibility"><input type="checkbox" disabled={busy} checked={showPassword} onChange={(event) => setShowPassword(event.currentTarget.checked)} /> Mostrar contraseñas</label>
          <button type="submit" disabled={busy}>{busy ? 'Creando cuenta…' : 'Crear cuenta'}</button>
        </form>}
        {error && <p ref={errorRef} tabIndex={-1} className="auth-page__error" role="alert">{error}</p>}
        <p role="status" aria-atomic="true">{busy ? 'Registrando y comprobando la sesión…' : auth.session ? `${completed ? 'Cuenta creada. ' : ''}Sesión iniciada como ${auth.session.user.name}.` : ''}</p>
        {!auth.session && <p>¿Ya tienes una cuenta? <Link to="/login">Ir al inicio de sesión</Link></p>}
        <Link to="/catalog">Volver al catálogo</Link>
      </div>
    </main>
  </>;
}
