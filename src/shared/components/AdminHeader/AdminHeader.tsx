import { Link, NavLink } from 'react-router-dom';
import './AdminHeader.css';

import { useAuth } from "../../../features/auth/AuthContext";

export function AdminHeader() {
  const { session, expired, logout } = useAuth();
  return <header className="admin-header">
    <div className="admin-header__inner">
      <span className="admin-header__brand">Fashion<span>Administración · Demo</span></span>
      <nav aria-label="Administración de demostración">
        <NavLink to="/admin/products">Productos</NavLink>
        <NavLink to="/admin/inventory">Inventario</NavLink>
        <NavLink to="/admin/notifications">Notificaciones</NavLink>
        <NavLink to="/admin/connection">Conexión API</NavLink>
        <Link to="/catalog">Ver catálogo</Link>
        <Link to="/checkout">Ir al checkout de demostración</Link>
        {session ? <><span>Sesión: {session.user.name}</span><button type="button" className="admin-header__logout" onClick={logout}>Cerrar sesión</button></> : <Link to="/login">Iniciar sesión</Link>}
      </nav>
      {expired && <p role="alert">Tu sesión venció. Vuelve a iniciar sesión.</p>}
    </div>
  </header>;
}
