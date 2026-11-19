import { useEffect, useRef } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { CustomerHeader } from '../../shared/components/CustomerHeader/CustomerHeader';
import { useAuth } from './AuthContext';
import './AuthPage.css';

import { adminPaths } from './adminNavigation';

export function RequireAdmin({ cartCount }: { cartCount: number }) {
  const { session } = useAuth();
  const location = useLocation();
  if (!session) return <Navigate to="/login" replace state={{ returnTo: adminPaths.find((path) => path === location.pathname) ?? '/admin/products' }} />;
  if (session.user.role !== 'administrador') return <AdminAccessDenied cartCount={cartCount} />;
  return <Outlet />;
}

function AdminAccessDenied({ cartCount }: { cartCount: number }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
    const previous = document.title;
    document.title = 'Acceso denegado | Fashion Online Store';
    return () => { document.title = previous; };
  }, []);
  return <>
    <CustomerHeader cartItemCount={cartCount} cartTo="/cart" homeTo="/catalog" contentHeadingId="access-denied-heading" skipLabel="Saltar al mensaje de acceso" />
    <main className="auth-page"><section className="auth-page__panel" aria-labelledby="access-denied-heading">
      <h1 id="access-denied-heading" ref={heading} tabIndex={-1}>Acceso denegado</h1>
      <p>Tu cuenta no tiene permisos de administración.</p>
      <Link to="/catalog">Volver al catálogo</Link>
    </section></main>
  </>;
}
