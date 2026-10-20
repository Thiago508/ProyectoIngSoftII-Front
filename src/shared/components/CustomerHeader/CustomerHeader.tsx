import { Link } from "react-router-dom";
import "./CustomerHeader.css";

interface CustomerHeaderProps {
  cartItemCount: number;
  cartTo?: string;
  homeTo?: string;
  contentHeadingId?: string;
  skipLabel?: string;
  search?: { query: string; onChange: (query: string) => void };
}

export function CustomerHeader({ cartItemCount, cartTo, homeTo = "/checkout", contentHeadingId = "checkout-heading", skipLabel = "Saltar al contenido del checkout", search }: CustomerHeaderProps) {
  return (
    <header className="customer-header">
      <a className="customer-header__skip" href={`#${contentHeadingId}`}>{skipLabel}</a>
      <div className="customer-header__inner">
        <Link className="customer-header__brand" to={homeTo} aria-label="Fashion Online Store">
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
            placeholder={search ? "Buscar por nombre..." : homeTo === "/catalog" ? "Busca desde el catálogo" : "Búsqueda pendiente"}
            disabled={!search}
            value={search?.query ?? ""}
            onChange={(event) => search?.onChange(event.currentTarget.value)}
            aria-describedby="header-demo-note"
          />
        </div>

        <nav
          className="customer-header__actions"
          aria-label="Acciones del usuario"
        >
          <Link to="/register" className="customer-header__action" aria-label="Registro de cliente (demostración)">
            <span aria-hidden="true">♙</span>
          </Link>

          {cartTo ? <Link to={cartTo} className="customer-header__action customer-header__cart" aria-label={`Carrito de compras: ${cartItemCount} unidades`}>
            <span aria-hidden="true">♡</span><span className="customer-header__cart-count">{cartItemCount}</span>
          </Link> : <button type="button" className="customer-header__action customer-header__cart" aria-label={`Carrito de demostración: ${cartItemCount} unidades (pendiente de implementar)`} disabled>
            ♡<span className="customer-header__cart-count">{cartItemCount}</span>
          </button>}
        </nav>
        <p id="header-demo-note" className="customer-header__notice">Demo: registro sin creación de cuentas. {search ? "Búsqueda por nombre disponible." : "Busca desde el catálogo."} {cartTo ? "Carrito en memoria." : "Carrito de demostración sin conexión."}</p>
      </div>
    </header>
  );
}