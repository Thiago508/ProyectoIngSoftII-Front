import { Link, NavLink } from 'react-router-dom';
import './AdminHeader.css';

export function AdminHeader() {
  return <header className="admin-header">
    <div className="admin-header__inner">
      <span className="admin-header__brand">Fashion<span>Administración · Demo</span></span>
      <nav aria-label="Administración de demostración">
        <NavLink to="/admin/products">Productos</NavLink>
        <NavLink to="/admin/inventory">Inventario</NavLink>
        <Link to="/catalog">Ver catálogo</Link>
        <Link to="/checkout">Ir al checkout de demostración</Link>
      </nav>
    </div>
  </header>;
}
