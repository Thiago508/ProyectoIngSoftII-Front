# Estado de requisitos: frontend e integración

Fuente: `PR - TiendaRopa.xlsx`, hoja «Priorización de Requerimientos»,
35 SWR agrupados en F-01–F-08. Revisión documental actualizada el 18 de noviembre de 2026.
Este estado describe lo implementado localmente, no certifica funcionalidades de
producción. Las operaciones de negocio actuales usan datos en memoria. La nueva comprobación
de conexión consulta el endpoint de salud real; aún no sustituye las demos por APIs.
El OpenAPI actualizado documenta carrito, notificaciones y users/me, que estaban
pendientes en el informe anterior. Ver [Integración con backend](backend-integration.md)
para evidencia y cuestiones abiertas; una integración pendiente no implica que la
ruta no exista en el servidor.

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

La URL de desarrollo, el cliente HTTP común y la consulta de salud ya están
preparados. Se verificaron salud, CORS para localhost:5173, forma de catálogo e
inventario y rechazo del carrito sin token el 11 de noviembre; esas comprobaciones
no se repitieron en la revisión documental del 18 de noviembre. El nuevo OpenAPI
aclara COP sin centavos, cuatro campos obligatorios de envío y contratos tipados
para catálogo, inventario y ajustes. También declara Bearer en lecturas de inventario.
Siguen pendientes la integración frontend y las pruebas de los contratos nuevos;
no se deben confundir las aclaraciones documentales con operaciones ya integradas.


## Cambios documentados por backend el 18 de noviembre

- Dinero: pesos colombianos enteros, sin centavos; adaptar la conversión al modelo
  actual del frontend sin redondear importes al enviarlos.
- Pedido: enviar shipping_address, shipping_phone, shipping_city y shipping_department;
  alinear longitudes/patrón del formulario con CheckoutIn.
- Catálogo e inventario: usar CatalogOut/CatalogProductOut e InventoryListItemOut,
  sin suponer que catálogo tiene la misma forma que ProductOut.
- Ajustes: usar InventoryAdjustIn y enviar talla y motivo explícitos.
- Inventario: contrato protegido con Bearer; verificar también autorización por rol.

Para próximos bloques no hace falta esperar otra definición de moneda o dirección.
Se conserva como pendiente aclarar fechas con zona, destinatario, disponibilidad
pública por talla, permisos efectivos y recuperación de respuestas inciertas. El
estado de implementación de las pantallas de la tabla superior no cambió en esta
revisión. Ver [Comparación de contratos](backend-integration.md).


## Bloque de autenticación real — 18 de noviembre

Registro y login ya envían los formatos documentados a la API y confirman el
perfil mediante GET /users/me. Se añadieron nombre, validación de alta, errores
HTTP/422, prevención de doble envío, cierre y vencimiento por exp. El token vive
solo en memoria; una recarga requiere nuevo login. Contraseñas no se conservan
al terminar una solicitud. Cambiar identidad limpia borradores personales, pedidos
y avisos demo, conservando el carrito local.

Este bloque sustituye el estado anterior de formularios exclusivamente locales.
No completa todavía navegación administrativa por rol ni integra operaciones de
negocio. Registro/login tienen pruebas con API interceptada; no equivalen a una
validación completa del backend desplegado.

El mensaje técnico posterior aclara fechas locales sin zona, stock_by_size como
disponible, vigencia JWT y recuperación de pagos. Contradice Swagger respecto a
campos de envío en POST /orders y acceso público de inventario. Las indicaciones
anteriores de este documento sobre esos contratos deben leerse como revisión del
Swagger, no como decisiones ya implementadas. Véase backend-integration.md.


## Protección de navegación administrativa

Las rutas /admin/products, /admin/inventory, /admin/notifications y
/admin/connection requieren una sesión cuyo perfil confirmado tenga rol
administrador. Sin sesión redirigen a login y conservan únicamente un destino
administrativo conocido; al iniciar sesión se vuelve a él. Cliente o rol desconocido
ve una pantalla de acceso denegado con foco en su título y retorno al catálogo.
El enlace administrativo no se ofrece a esos perfiles; para visitantes abre login.
Cerrar sesión, recargar o vencer el token retira las pantallas protegidas.

Los formularios administrativos siguen operando sobre datos de demostración. Esta
barrera de navegación no sustituye la autorización de cada endpoint en backend.
No se cambian permisos de catálogo, carrito o checkout demo. El manejo global de
401/403 de futuras operaciones reales y las integraciones de negocio siguen pendientes.

Verificación manual: abrir /admin/inventory sin sesión, acceder con administrador,
cerrar sesión y repetir con cliente; comprobar redirección, acceso denegado y que
recargar no restaura la sesión. Las pruebas de negocio usan login con API
interceptada y vuelven a autenticar tras recargas, sin persistir credenciales.


## Avance de catálogo real

Listado y detalle públicos conectados a la API: búsqueda por nombre, fotos remotas,
precios COP y disponibilidad por talla, con carga/error/reintento/vacío/404.
El modo de demostración continúa separado. Carrito real integrado en el bloque siguiente; falta conectar checkout,
pedidos, pagos, administración y avisos a sus endpoints. El catálogo real no envía
artículos al carrito demo ni presenta una compra como integrada.


## Avance de carrito real

Carrito autenticado conectado: consulta, agregar desde detalle, actualizar cantidad
y eliminar por producto/talla. Contador y subtotales reflejan la respuesta del
servidor. Se incorporan espera, errores, consulta tras resultado incierto y limpieza
al cerrar/cambiar sesión; 401 invalida sesión y 403 conserva la cuenta.
Carrito demo sigue independiente. La persistencia corresponde al backend y no
se simula en localStorage. Faltan creación/consulta de pedidos reales, pagos,
operaciones administrativas y avisos. El checkout demo no recibe el carrito API.


## Avance de productos administrativos reales

Alta, edición y desactivación conectadas al contrato de productos, con navegación
protegida de administrador, validación COP entero y metadata completa. La demo
sigue independiente mediante source=demo. Se manejan 401/403/409/422 y recuperación
tras escritura incierta, evitando repetir altas automáticamente. Las fotos reales
se configuran por URL; subida de archivos no está disponible en el contrato.
No se integran existencias con editar metadata: falta inventario por talla, además
de pedidos, checkout real, pagos y avisos. Las pruebas de escritura son interceptadas.


## Avance de inventario real — 19 de noviembre de 2026

Consulta de físico, reservado y disponible por producto/talla y ajuste absoluto
con motivo conectados a la API. Permite ingresar una talla nueva, cantidades cero
y productos aún sin filas. Incluye bloqueo de doble envío, validación local frente
a reserva consultada, foco accesible, 401/403/409/422 y consulta de recuperación
tras resultado incierto. El servidor conserva autoridad sobre stock y concurrencia.
Inventario demo y su laboratorio de reservas permanecen independientes.

Quedan pedidos y checkout reales, pagos, notificaciones e intentos administrativos.
No hay historial real de ajustes en frontend: la respuesta actual solo entrega
cantidades confirmadas, sin identificador de auditoría, actor o fecha. Backend
local no respondió al intento de lectura de esta revisión; las escrituras se
validan con API interceptada.


## Avance de notificaciones reales — 19 de noviembre de 2026

Bandeja autenticada con consulta, filtros y marcado como leído confirmado mediante
GET posterior. Consulta administrativa de intentos, resultado/error y filtro por
resultado real. Incluye carga, vacío, recuperación, 401/403, cancelación y limpieza
al cerrar/cambiar sesión, con rechazo de respuestas con avisos de otra cuenta.
Los ejemplos demo siguen separados y no generan mensajes del servidor.

Quedan checkout, creación/consulta de pedidos y pagos reales. El frontend no
implementa entrega, firma HMAC de webhook, reintento de mensajes ni procesos de
expiración del backend. Los intentos se consultan sin acreditar recepción.
La zona de fechas de notificaciones no fue aclarada: se conserva el texto del
servidor sin convertirlo. El contrato de envío de pedidos sigue pendiente de
conciliar entre Swagger y el mensaje técnico.
