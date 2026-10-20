# Estado de requisitos: frontend e integración

Fuente: `PR - TiendaRopa.xlsx`, hoja «Priorización de Requerimientos»,
35 SWR agrupados en F-01–F-08. Revisión del código del 20 de octubre de 2026.
Este estado describe lo implementado localmente, no certifica funcionalidades de
producción. Las pantallas y operaciones actuales usan datos en memoria.

| Funcionalidad y requisitos | Implementado en frontend | Pendiente para cumplir el requisito completo |
| --- | --- | --- |
| F-01 · SWR-01–05 | Carrito vacío bloqueado, validación de datos, revisión antes de confirmar, rechazo de disponibilidad simulado, creación con error/reintento, identificador y detalle local. El borrador sobrevive a editar carrito. | Crear y consultar pedidos reales; recibir precios y disponibilidad definitivos; gestionar rechazos y respuestas inciertas del servidor sin duplicar pedidos. |
| F-02 · SWR-06–10 | Alta de talla/SKU con cero stock, consulta de existente/reservado/disponible, ajustes con historial y laboratorio de reserva, liberación y conversión. | Fuente real de inventario y autorización; auditoría persistente, transacciones y concurrencia; conectar reserva con pedido y pago reales. Los cambios locales ya alimentan catálogo y comprobación de checkout. |
| F-03 · SWR-11–14 | Alta, consulta, edición, desactivación, código único y precio positivo locales; foto opcional. Detalle histórico conserva nombre/precio tras editar o desactivar. | Persistencia, unicidad global del identificador y autorización administrativa; respuestas de error de esas operaciones. |
| F-04 · SWR-15–18 | Catálogo activo, detalle, búsqueda parcial sin distinguir mayúsculas, mensaje sin coincidencias y fotos; consulta asíncrona simulada con carga, error, cancelación y reintento. | Consumir catálogo y disponibilidad del servidor y conectar sus errores reales con los estados de interfaz ya disponibles. La disponibilidad actual usa el inventario compartido de sesión, inicializado con ejemplos. |
| F-05 · SWR-19–22 | Agregar, acumular variantes, modificar cantidad, retirar, subtotal y conexión con checkout; no altera inventario. | Definir con backend la fuente y duración del carrito, si debe persistirse; sincronizar productos, variantes y precios reales. La recarga vacía el carrito local. |
| F-06 · SWR-23–26 | Selección de método y pantalla de resultado pendiente/aprobado/rechazado como vista previa separada. El resultado visual no paga el pedido. | Flujo de intento real elegible por pedido/reserva, importe del servidor, estados asíncronos y recuperación; verificación auténtica y aplicación única de efectos en backend. No hay procesamiento de pagos implementado. |
| F-07 · SWR-27–30 | Registro y acceso accesibles, validación de campos y confirmación de contraseña, sin selector de rol. No almacenan credenciales. | Crear cuentas, correo único y rol Cliente en servidor, bcrypt, autenticación y JWT. En frontend faltan consumo de esos resultados, sesión/cierre, vencimiento y navegación según permisos; la autorización efectiva debe ser del backend. Las rutas administrativas actuales son públicas de demostración. |
| F-08 · SWR-31–35 | Bandeja, estado vacío, referencia/estado/fecha, aviso local al crear un pedido y deduplicación en memoria. Avisos locales abren el detalle; ejemplos fijos no enlazan a pedidos inexistentes. Consulta administrativa de resultados e intentos fallidos con ejemplos. | Eventos confirmados para pagado/cancelado/enviado; propietarios autenticados, protección API, deduplicación durable y registro de procesamiento/intentos fallidos. Falta consumir los resultados reales; la consulta administrativa de intentos es visual y no hay envío ni historial real de entrega. |

## Pendientes del propio frontend

1. Conectar las pantallas existentes con las fuentes reales cuando se acuerden los
   contratos; completar carga, errores, recuperación y sincronización donde hoy solo
   hay validación o datos estáticos. El catálogo ya permite revisar esos estados
   mediante una consulta asíncrona explícitamente simulada. No se han inventado endpoints.
2. Conectar con el backend la relación producto–SKU/talla y la disponibilidad. En
   la demo ya se pueden registrar tallas para productos nuevos, con cero stock
   inicial, y después ingresar existencias mediante un ajuste con motivo. El
   catálogo y checkout consumen esas cantidades compartidas.
3. Implementar el comportamiento de sesión, cierre, vencimiento y rutas según rol
   a partir de una autenticación confiable; no basta ocultar el botón administrativo.
4. Completar la interacción del intento de pago y la recepción de sus resultados
   verificados; los tres escenarios visuales actuales no realizan esa operación.
5. Consumir notificaciones del propietario y los resultados de procesamiento que
   exponga el backend. La interfaz administrativa de consulta de intentos ya está
   disponible con ejemplos; no demuestra procesamiento ni entrega reales.
6. Completar la revisión manual con lector de pantalla y la validación visual con
   el usuario. Axe y pruebas de navegador cubren comportamiento automatizado,
   pero no sustituyen esa revisión.

La persistencia del carrito tras recarga, las reglas de envío y el total definitivo
requieren acordar el comportamiento esperado. No se presentan como políticas ya
exigidas o definidas por el Excel.

## Mockups y alcance

Home promocional, favoritos, perfil completo, seguimiento del transporte,
dashboard, reportes y otras pantallas de los mockups no aparecen como requisitos
explícitos dentro de estos 35 SWR. No se consideran terminados ni se añaden por
suposición: requieren confirmar si forman parte de la entrega además del Excel.

## Corrección visual de esta revisión

El enlace «Continuar con la compra» usa ahora una clase propia del carrito con
texto blanco y fondo principal, también en hover. Se elimina su dependencia del
CSS de checkout y la sobrescritura causada por el estilo general de enlaces.
El encabezado incorpora «Administración (demo)», que abre `/admin/products` y
permite navegar a inventario. Es un acceso a las pantallas locales existentes,
no una autenticación o autorización administrativa.


## Orden recomendado para los siguientes bloques

- Preparar los estados de carga, error y recuperación de las consultas y formularios
  cuando exista una fuente asíncrona definida. No convertir una validación local en
  un registro o acceso supuestamente real.
- Conectar sesión/cierre, vencimiento y navegación por rol con autenticación confiable.
- Conectar inicio de pago, elegibilidad por pedido/reserva e importe del servidor;
  recibir y presentar resultados verificados.
- Conectar operaciones reales de pedidos, catálogo, productos, inventario y avisos,
  incluyendo persistencia, errores y comprobaciones del servidor.
- Completar revisión manual de accesibilidad y la validación de diseño con el usuario.

Las tallas/SKU de productos nuevos, su ingreso de existencias, la consulta visual
de intentos fallidos y los estados de carga/error/reintento del catálogo ya no
están pendientes de interfaz en la demostración.
