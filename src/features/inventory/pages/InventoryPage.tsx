import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { inventoryDemo } from '../demo/inventoryDemo';
import './InventoryPage.css';

export function InventoryPage() {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
    const previousTitle = document.title;
    document.title = 'Inventario | Fashion Online Store';
    return () => { document.title = previousTitle; };
  }, []);

  return (
    <div className="inventory-page">
      <a className="inventory-page__skip" href="#inventory-heading">Saltar al inventario</a>
      <header className="inventory-page__header">
        <span className="inventory-page__brand">Fashion <span>Administración · Demo</span></span>
        <Link to="/checkout">Ir al checkout de demostración</Link>
      </header>
      <main className="inventory-page__main">
        <h1 id="inventory-heading" ref={headingRef} tabIndex={-1}>Inventario</h1>
        <p className="inventory-page__notice">Datos de demostración. El acceso de administrador todavía no está protegido; no hay autenticación ni conexión a inventario real.</p>
        <section aria-labelledby="inventory-help-heading" className="inventory-page__help">
          <h2 id="inventory-help-heading">Cómo leer las cantidades</h2>
          <p><strong>Existente:</strong> unidades en inventario. <strong>Reservado:</strong> unidades comprometidas en pedidos. <strong>Disponible:</strong> existente menos reservado.</p>
          <p>Un artículo puede tener existencias y ninguna unidad disponible si todas están reservadas. Esta consulta no crea, libera ni descuenta reservas.</p>
        </section>
        <p id="inventory-table-help">Cada fila representa una talla vendible. En pantallas estrechas, desplaza la tabla horizontalmente para consultar todas las columnas.</p>
        <div className="inventory-page__table-region" role="region" aria-label="Cantidades de inventario por artículo" aria-describedby="inventory-table-help" tabIndex={0}>
          <table className="inventory-page__table">
            <caption>Existencias, reservas y disponibilidad — datos simulados</caption>
            <thead>
              <tr>
                <th scope="col">Artículo / SKU</th>
                <th scope="col">Talla</th>
                <th scope="col">Existente</th>
                <th scope="col">Reservado</th>
                <th scope="col">Disponible</th>
                <th scope="col">Disponibilidad</th>
              </tr>
            </thead>
            <tbody>
              {inventoryDemo.map((item) => {
                const available = item.existing - item.reserved;
                return (
                  <tr key={item.sku}>
                    <th scope="row">{item.name}<span className="inventory-page__sku">{item.sku}</span></th>
                    <td>{item.size}</td>
                    <td>{item.existing}</td>
                    <td>{item.reserved}</td>
                    <td className="inventory-page__available">{available}</td>
                    <td><span className={`inventory-page__badge ${available === 0 ? 'inventory-page__badge--empty' : ''}`}>{available > 0 ? 'Disponible' : 'Sin disponibilidad'}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p>Este incremento permite consultar cantidades (SWR-06). El ajuste administrativo y su historial se incorporarán en el siguiente bloque.</p>
      </main>
    </div>
  );
}
