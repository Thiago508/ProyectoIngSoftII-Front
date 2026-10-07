import { Link } from "react-router-dom";
import "./CustomerHeader.css";

export function CustomerHeader() {
  return (
    <header className="customer-header">
      <Link className="customer-header__brand" to="/checkout">
        <span className="customer-header__brand-name">Fashion</span>
        <span className="customer-header__brand-subtitle">Online Store</span>
      </Link>

      <div className="customer-header__search">
        <label htmlFor="product-search" className="sr-only">
          Buscar productos
        </label>

        <input
          id="product-search"
          type="search"
          placeholder="Buscar productos..."
        />
      </div>

      <nav
        className="customer-header__actions"
        aria-label="Acciones del usuario"
      >
        <button
          type="button"
          className="customer-header__action"
          aria-label="Mi perfil"
        >
          ♙
        </button>

        <button
          type="button"
          className="customer-header__action customer-header__cart"
          aria-label="Carrito de compras"
        >
          ♡
          <span className="customer-header__cart-count">3</span>
        </button>
      </nav>
    </header>
  );
}