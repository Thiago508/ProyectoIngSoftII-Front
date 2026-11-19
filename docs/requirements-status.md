# Estado de requisitos: frontend e integración

Revisión: **19 de noviembre de 2026**. Fuente: `PR - TiendaRopa.xlsx`, hoja
«Priorización de Requerimientos»: 35 requisitos SWR, agrupados en F-01–F-08.
Se contrastó el Excel con el código y las pruebas actuales. Esta matriz sustituye
los estados anteriores que describían las funcionalidades como demos pendientes de API.

**Conectado** significa que existe interfaz y consumo del contrato, con pruebas
unitarias y de navegador que interceptan la API. No certifica autorización,
transacciones, persistencia, concurrencia, entrega o cobros del servidor. El pago
conectado usa la pasarela **de prueba** documentada por backend.

## Matriz vigente de los 35 requisitos

### F-01 · Realizar pedido

| SWR | Requisito y evidencia de frontend | Comprobación pendiente del sistema |
| --- | --- | --- |
| SWR-01 | Rechaza carrito vacío antes de POST /orders; revisión API bloquea confirmar. | Rechazo equivalente en servidor ante petición directa. |
| SWR-02 | Muestra disponibilidad por talla, revisa selección y presenta rechazos de stock al crear. No decide la disponibilidad definitiva. | Verificación transaccional de todas las líneas y concurrencia. |
| SWR-03 | Revisión de cuenta, productos, tallas, cantidades y subtotal consultado antes de confirmar. | Aceptación del flujo por el usuario. El servidor actual no guarda dirección ni destinatario alternativo. |
| SWR-04 | POST /orders envía únicamente items, valida respuesta y conserva el resultado entre rutas. Bloquea doble clic y resultados inciertos. | Persistencia real de pedido/líneas y reserva atómica. |
| SWR-05 | Presenta referencia, total y reserva confirmados; detalle autenticado por ID y acceso desde notificaciones. | Compra completa en entorno backend de pruebas, incluido resultado perdido. No existe listado GET /orders. |

Evidencia: `src/features/orders/createApiOrder.ts`, `OrderCreationProvider.tsx`,
`src/features/checkout/pages/ApiCheckoutPage.tsx`, `src/features/orders/ApiOrderPage.tsx`;
`tests/create-order-api.spec.ts`, `tests/orders-api.spec.ts`.

### F-02 · Gestionar inventario

| SWR | Requisito y evidencia de frontend | Comprobación pendiente del sistema |
| --- | --- | --- |
| SWR-06 | Consulta físico, reservado y disponible por producto/talla; valida disponible = físico − reservado. | Autorización y consistencia de las cantidades de la instancia real. |
| SWR-07 | Pantalla protegida de administrador; ajuste absoluto con motivo, entero no negativo y no inferior a la reserva consultada. | Auditoría persistente de anterior/nuevo, motivo, actor y fecha; permisos efectivos. La respuesta del ajuste solo devuelve cantidades. |
| SWR-08 | Crear pedido delega reserva al backend y muestra su estado; no reserva localmente. | Atomicidad de todas las líneas y prevención de sobreventa entre clientes. |
| SWR-09 | Muestra cancelación/expiración/reserva recibidas, sin inventar vencimientos ni liberar desde el navegador. | Liberación una sola vez, eventos repetidos y proceso de expiración del servidor. |
| SWR-10 | Muestra reserva/estado tras pago confirmado; no descuenta físico desde frontend. | Consumo transaccional de reserva una sola vez al aprobar pago. |

Evidencia: `src/features/inventory/inventoryApi.ts`, `pages/ApiInventoryPage.tsx`;
`tests/inventory-api.spec.ts`. El laboratorio demo valida ejemplos locales,
pero no acredita transacciones ni concurrencia reales.

### F-03 · Gestionar producto

| SWR | Requisito y evidencia de frontend | Comprobación pendiente del sistema |
| --- | --- | --- |
| SWR-11 | Alta de administrador con nombre, descripción obligatoria, precio COP positivo y slug/SKU. Maneja conflictos y no permite elegir rol. | Unicidad global del identificador y autorización del endpoint. |
| SWR-12 | Consulta y edición de metadata mediante GET/PUT; cancelación sin escritura y errores por campo. Editar no cambia stock ni reactiva por accidente. | Persistencia y reglas de edición en la instancia real. |
| SWR-13 | Desactiva mediante PATCH específico y muestra la respuesta confirmada; catálogo excluye inactivos. | Rechazo de nuevas compras y acceso administrativo efectivo en servidor. |
| SWR-14 | Detalle del pedido usa nombre/precio de sus líneas históricas; no los reconstruye con catálogo. | Persistencia histórica después de editar/desactivar el producto en backend. |

Evidencia: `src/features/products/productsApi.ts`, `pages/ApiProductsPage.tsx`,
`src/features/orders/ordersApi.ts`; `tests/products-api.spec.ts`, `tests/orders-api.spec.ts`.
Fotos reales usan URL/ruta porque no existe endpoint documentado de subida de archivos.

### F-04 · Consultar catálogo

| SWR | Requisito y evidencia de frontend | Comprobación pendiente del sistema |
| --- | --- | --- |
| SWR-15 | GET /catalog, productos activos con identificador, nombre, precio y foto o alternativa. | Catálogo real con datos representativos y revisión visual final. |
| SWR-16 | GET /products/{id}, descripción, precio y stock_by_size como disponible. Maneja 404 sin sustituirlo por demo. | Exactitud de disponibilidad del backend bajo concurrencia. |
| SWR-17 | Coincidencia parcial del nombre sin distinguir mayúsculas, sobre la respuesta completa del catálogo, conservando búsqueda en URL. | Validación funcional con datos representativos; no se presupone paginación no documentada. |
| SWR-18 | Mensaje sin coincidencias diferenciado de vacío, carga o error; recuperación explícita. | Aceptación visual y revisión manual de accesibilidad. |

Evidencia: `src/features/catalog/catalogApi.ts`, `useCatalog.ts`, `pages/CatalogPage.tsx`;
`tests/catalog-api.spec.ts`, `tests/catalog-loading.spec.ts`.

### F-05 · Gestionar carrito

| SWR | Requisito y evidencia de frontend | Comprobación pendiente del sistema |
| --- | --- | --- |
| SWR-19 | Agrega producto activo, talla y cantidad entera positiva con Bearer; servidor devuelve carrito confirmado. | Validación equivalente del servidor frente a peticiones directas. |
| SWR-20 | Actualiza cantidad y retira por producto/talla; bloquea solicitudes simultáneas y consulta tras resultado incierto. | Persistencia y aislamiento del carrito entre cuentas en backend. |
| SWR-21 | Valida líneas y subtotal COP recibido: precio × cantidad y suma, sin acumular decimales de coma flotante. | Importes definitivos del servidor y consistencia al cambiar precios. |
| SWR-22 | Solo usa endpoints de carrito; no ajusta inventario al agregar, editar o retirar. | Demostrar que esas operaciones no alteran stock/reservas en servidor. |

Evidencia: `src/features/cart/cartApi.ts`, `ApiCartProvider.tsx`, `pages/ApiCartPage.tsx`;
`tests/cart-api.spec.ts`.

### F-06 · Procesar pago

| SWR | Requisito y evidencia de frontend | Comprobación pendiente del sistema |
| --- | --- | --- |
| SWR-23 | Consulta pedido propio pendiente_pago con reserva activa; muestra importe del servidor y envía método/token de prueba, nunca importe o estado elegido por UI. | Vigencia y elegibilidad verificadas de nuevo por backend al autorizar. |
| SWR-24 | Verifica identidad, propietario, moneda COP y coincidencia del importe antes de mostrar confirmación; consulta GET después del intento. | Autenticidad de la confirmación y validación de pedido/importe/moneda en servidor/PSP; no se verifica HMAC desde navegador. |
| SWR-25 | Bloqueo de doble envío entre rutas y consulta antes del reintento manual sobre el mismo ID; no crea otro pedido ni modifica stock. | Idempotencia y aplicación única de efectos entre clientes, webhooks y eventos repetidos. |
| SWR-26 | Muestra estados consultados, rechazo y aprobación solo coherente. Respuesta perdida o contradictoria no se presenta como éxito. | Registro durable y resultado efectivo de la pasarela de prueba en backend. |

Evidencia: `src/features/payments/paymentApi.ts`, `PaymentProvider.tsx`, `ApiPaymentPage.tsx`;
`tests/payment-api.spec.ts`. Tokens disponibles: `tok_ok` y `tok_declined`.
Una pasarela bancaria de producción no forma parte del contrato implementado.

### F-07 · Gestionar usuarios

| SWR | Requisito y evidencia de frontend | Comprobación pendiente del sistema |
| --- | --- | --- |
| SWR-27 | Registro JSON con nombre/correo/contraseña y confirmación local; sin selector ni envío de rol; maneja correo duplicado. | Unicidad y asignación obligatoria de Cliente en el servidor. |
| SWR-28 | Contraseñas se limpian al terminar y no se registran ni persisten en navegador. | Hash bcrypt y exclusión de contraseña/hash de todas las respuestas API: responsabilidad y evidencia de backend. |
| SWR-29 | Login OAuth2, perfil GET /users/me con Bearer, sesión en memoria, cierre y vencimiento por exp. Sin refresh inventado. | Emisión/firma/vencimiento real del JWT y rechazo de credenciales erróneas en backend. |
| SWR-30 | Rutas administrativas protegidas por perfil confirmado; cliente/rol desconocido denegados, 401 invalida sesión y 403 conserva cuenta con error. | Autorización en cada endpoint protegido, token inválido/vencido y acceso directo sin UI. |

Evidencia: `src/features/auth/authApi.ts`, `AuthProvider.tsx`, `RequireAdmin.tsx`;
`tests/login.spec.ts`, `tests/registration.spec.ts`, `tests/admin-access.spec.ts`.

### F-08 · Notificar estado del pedido

| SWR | Requisito y evidencia de frontend | Comprobación pendiente del sistema |
| --- | --- | --- |
| SWR-31 | Consulta bandeja real; no fabrica eventos a partir de un clic ni de una vista previa de pago. | Generación de avisos al registrar/pagar/cancelar/enviar un pedido. |
| SWR-32 | Muestra ID de pedido, estado resultante, mensaje y fecha del servidor; asociaciones/fechas nulas se indican sin inventarlas. | Que cada evento real incluya los datos y fecha requeridos. |
| SWR-33 | Bearer, validación de propietario antes de mostrar, limpieza al salir y cancelación de consultas. | Denegar en API la consulta del contenido de otro cliente. Ocultar datos en UI no sustituye ese control. |
| SWR-34 | No duplica avisos localmente ni reenvía eventos; valida IDs de respuesta y confirma lectura mediante GET. | Una notificación lógica por evento aunque el procesamiento se repita. |
| SWR-35 | Consulta administrativa real de intentos, resultado/error y filtro por resultados presentes. No envía ni reintenta mensajes. | Persistencia de intentos y evidencia de procesamiento/entrega del servidor. Resultado procesado no acredita recepción. |

Evidencia: `src/features/notifications/notificationsApi.ts`, `useNotificationApi.ts`,
`ApiNotificationsPage.tsx`, `ApiNotificationAttemptsPage.tsx`;
`tests/notifications-api.spec.ts`.

## Pendientes concretos

1. Ejecutar la compra completa con un backend de pruebas y datos autorizados,
   incluyendo rechazo, pago pendiente/aprobado/rechazado y resultado perdido.
   Las escrituras de la suite frontend están interceptadas; no prueban transacciones reales.
2. Obtener evidencia backend de auditoría, stock transaccional, expiración,
   idempotencia, bcrypt, permisos y eventos/notificaciones (columnas anteriores).
   No corresponde resolverlo con simulaciones adicionales en frontend.
3. Completar revisión manual con lector de pantalla y aceptación visual del usuario.
   Axe, teclado/foco y pruebas responsive automatizadas no sustituyen esa revisión.
4. Mantener actualizado el Swagger distribuido: la instancia consultada define
   creación con solo items y no guarda envío/destinatario alternativo. La UI API
   no promete persistir el formulario de envío demo.

No falta conectar otra pantalla de los 35 SWR al contrato disponible. Esto describe
el alcance frontend implementado, **no significa que los 35 requisitos del sistema
estén certificados de extremo a extremo**. Un listado «Mis pedidos», subida de
archivos o historial de ajustes visible requieren contrato adicional si se incluyen
en la entrega; el Excel exige registrar auditoría, no especifica una pantalla de historial.

## Límites y conservación de datos

- API por defecto; `source=demo` conserva ejemplos locales independientes. El laboratorio
  de reservas y las vistas previas no mueven inventario ni pagan pedidos reales.
- Token y datos privados viven en memoria; recargar requiere login. El carrito durable
  corresponde al servidor. No se guardan credenciales o datos personales en localStorage.
- Crear pedido sin idempotencia usa una marca anónima por pestaña en sessionStorage,
  sin usuario, token, carrito ni ID. Conserva el bloqueo de resultado incierto al recargar;
  no garantiza idempotencia entre pestañas/dispositivos y puede bloquear otra cuenta
  en la misma pestaña sin revelar datos de la anterior.
- Fechas de pedidos/notificaciones se conservan como llegan; no se convierten timestamps
  sin zona como si fueran UTC ni se deduce expiración con el reloj del navegador.
- Mockups también incluyen home, favoritos, perfil completo, seguimiento, dashboard y
  reportes. No se cuentan como implementados por esta matriz de 35 SWR ni se agregan
  requisitos que el Excel no enumera. Su entrega visual debe acordarse por separado.

## Validación de esta revisión

Resultado final: **build, lint y suite unitaria correctos; 321 pruebas de navegador
correctas** (107 casos en escritorio, tableta y móvil). Incluye las regresiones
de demo y API, foco, comprobaciones axe y diseño responsive disponibles en la suite.
Se comprobó que la matriz contiene exactamente 35 SWR únicos, del 01 al 35.

Las lecturas reales completaron autenticación/perfil, catálogo (12), productos (12),
inventario (60 filas), carrito (1 línea), bandeja (0) e intentos (0). Carrito e
intentos sin token devolvieron 401 y salud permitió Origin localhost:5173.
No se hicieron escrituras de negocio. Ver [evidencia](backend-integration.md).

Comandos reproducibles: `npm run build`, `npm run lint`, `npm test` y
`npm run test:e2e`. Las pruebas de navegador interceptan API y no prueban por sí
solas stock transaccional, recepción de mensajes o autorización real por rol.
