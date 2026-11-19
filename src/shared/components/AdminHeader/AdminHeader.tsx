import { Link, NavLink, useLocation, useSearchParams } from 'react-router-dom';
import './AdminHeader.css';

import { useAuth } from "../../../features/auth/AuthContext";

export function AdminHeader() {
  const { session, expired, logout } = useAuth();
  const [params] = useSearchParams();
  const location = useLocation();
  const demo = (params.get('source') ?? import.meta.env.VITE_CATALOG_SOURCE) === 'demo';
  const realAdministration = ['/admin/products', '/admin/inventory', '/admin/notifications'].includes(location.pathname) && !demo;
  const suffix = params.has('source') ? `?source=${demo ? 'demo' : 'api'}` : '';
  return <header className="admin-header">
    <div className="admin-header__inner">
      <span className="admin-header__brand">Fashion<span>{realAdministration ? "Administración · Servidor" : "Administración · Demo"}</span></span>
      <nav aria-label={realAdministration ? "Administración" : "Administración de demostración"}>
        <NavLink to={`/admin/products${suffix}`}>Productos</NavLink>
        <NavLink to={`/admin/inventory${suffix}`}>Inventario</NavLink>
        <NavLink to={`/admin/notifications${suffix}`}>Notificaciones</NavLink>
        <NavLink to={`/admin/connection${suffix}`}>Conexión API</NavLink>
        <Link to={`/catalog${suffix}`}>Ver catálogo</Link>
        <Link to="/checkout">Ir al checkout de demostración</Link>
        {session ? <><span>Sesión: {session.user.name}</span><button type="button" className="admin-header__logout" onClick={logout}>Cerrar sesión</button></> : <Link to="/login">Iniciar sesión</Link>}
      </nav>
      {expired && <p role="alert">Tu sesión venció. Vuelve a iniciar sesión.</p>}
    </div>
  </header>;
}
