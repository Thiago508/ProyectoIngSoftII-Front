import { Link, useSearchParams } from "react-router-dom";
import "./CustomerHeader.css";

import { useApiCart } from "../../../features/cart/ApiCartContext";

import { useAuth } from "../../../features/auth/AuthContext";

interface CustomerHeaderProps {
  cartItemCount: number;
  catalogSource?: "api" | "demo";
  cartTo?: string;
  homeTo?: string;
  contentHeadingId?: string;
  skipLabel?: string;
  search?: { query: string; onChange: (query: string) => void };
}

export function CustomerHeader({ catalogSource, cartItemCount, cartTo, homeTo = "/checkout", contentHeadingId = "checkout-heading", skipLabel = "Saltar al contenido del checkout", search }: CustomerHeaderProps) {
  const { session, expired, logout } = useAuth();
  const serverCart = useApiCart();
  const [params] = useSearchParams();
  const adminDemo = (params.get("source") ?? import.meta.env.VITE_CATALOG_SOURCE) === "demo";
  const realCart = catalogSource === "api";
  const count = realCart ? serverCart.cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0 : cartItemCount;
  const countKnown = !realCart || serverCart.cart !== null;
  const cartHref = realCart ? "/cart?source=api" : cartTo === "/cart" ? "/cart?source=demo" : cartTo;
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
            placeholder={search ? "Buscar por nombre..." : homeTo.startsWith("/catalog") ? "Busca desde el catálogo" : "Búsqueda pendiente"}
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
          <Link to={session ? "/login" : "/register"} className="customer-header__action" aria-label={session ? "Cuenta de usuario" : "Registro de cliente"}>
            <span aria-hidden="true">♙</span>
          </Link>

          <Link to={params.has("source") ? `/notifications?source=${adminDemo ? "demo" : "api"}` : "/notifications"} className="customer-header__action" aria-label={adminDemo ? "Notificaciones (demostración)" : "Notificaciones"}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true" focusable="false">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
              <path d="M10 21h4" />
            </svg>
          </Link>

          {cartHref ? <Link to={cartHref} className="customer-header__action customer-header__cart" aria-label={countKnown ? `Carrito de compras: ${count} unidades` : "Carrito de compras: consultar"}>
            <span aria-hidden="true">♡</span><span className="customer-header__cart-count">{countKnown ? count : "—"}</span>
          </Link> : <button type="button" className="customer-header__action customer-header__cart" aria-label={`Carrito de demostración: ${count} unidades (pendiente de implementar)`} disabled>
            ♡<span className="customer-header__cart-count">{countKnown ? count : "—"}</span>
          </button>}
        </nav>
        <div className="customer-header__secondary">
          <p id="header-demo-note" className="customer-header__notice">{catalogSource === "api" ? "Catálogo y carrito del servidor. Pedidos de demostración." : "Catálogo, carrito y pedidos de demostración."} {search ? "Búsqueda por nombre disponible." : "Busca desde el catálogo."} {realCart ? "Inicia sesión para consultar tu carrito." : cartTo ? "Carrito en memoria." : "Carrito de demostración sin conexión."}</p>
          {session ? <><span className="customer-header__session">Sesión: {session.user.name}</span><button className="customer-header__admin" type="button" onClick={logout}>Cerrar sesión</button></> : <Link className="customer-header__admin" to="/login">Iniciar sesión</Link>}
          {expired && <p className="customer-header__notice" role="alert">Tu sesión venció. Vuelve a iniciar sesión.</p>}
          {(!session || session.user.role === "administrador") && <Link className="customer-header__admin" to={params.has("source") ? `/admin/products?source=${adminDemo ? "demo" : "api"}` : "/admin/products"} aria-label={adminDemo ? "Administración (demostración)" : "Administración"}>{adminDemo ? "Administración (demo)" : "Administración"}</Link>}
        </div>
      </div>
    </header>
  );
}