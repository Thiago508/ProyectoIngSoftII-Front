# Integración con backend: evidencia y cuestiones abiertas

Revisión documental: 18 de noviembre de 2026. Fuentes: `openapi (1).json`,
`openapi.json` entregados por el equipo,
«Informe Técnico de Estado Actual del Backend.docx» y comprobaciones HTTP de lectura
contra el servidor local confirmado por el usuario. El OpenAPI documenta contratos;
no certifica por sí solo la implementación o sus reglas de autorización.

## Aclaraciones del OpenAPI del 18 de noviembre

No se añadieron ni eliminaron rutas respecto al archivo anterior; cambiaron
contratos, descripciones monetarias y seguridad. No se probó el servidor de nuevo
en esta revisión. La versión declarada continúa siendo 0.1.0.

| Cuestión anterior | Contrato nuevo y consecuencia para frontend |
| --- | --- |
| Unidad monetaria | price, unit_price, line_subtotal, subtotal, total y amount se documentan como pesos colombianos enteros, sin centavos. currency es COP. Al adaptar al modelo actual en centavos, multiplicar por 100 al leer y exigir divisibilidad exacta por 100 al escribir; no redondear silenciosamente precios fraccionarios. |
| Datos de envío | POST `/orders` exige shipping_address, shipping_phone, shipping_city y shipping_department, además de items. OrderOut devuelve esos cuatro campos como anulables para admitir pedidos sin esos datos. |
| Catálogo | `/catalog` devuelve CatalogOut con items de CatalogProductOut y count. Este contrato es distinto de ProductOut: no exige stock_by_size. Usar is_active del contrato público. |
| Inventario general | `/inventory` devuelve InventoryListItemOut[], filas por product_id y size con quantity, reserved y available. Queda tipado el formato plano observado anteriormente. |
| Ajustes | `/inventory/adjustments` recibe InventoryAdjustIn: product_id y new_quantity obligatorios; size tiene valor por defecto M y reason un valor por defecto documentado. El frontend debe seguir enviando talla y motivo explícitos. No confundir con el endpoint legacy `/inventory/adjust`, que usa quantity_delta. |
| Protección de inventario | GET `/inventory` y GET `/inventory/{product_id}` declaran OAuth2/Bearer. Esto resuelve la omisión de seguridad en el contrato; aún requiere comprobar el comportamiento desplegado y la restricción por rol. |
| Búsqueda y legacy | `/products/search` devuelve ProductSearchOut. `/orders/checkout` se identifica como compatibilidad legacy y tipa su cuerpo. Para crear pedidos nuevos se mantiene POST `/orders`. |
| Servidor | servers declara http://127.0.0.1:8000 y las rutas incluyen /api/v1. Nuestra VITE_API_URL sigue siendo http://127.0.0.1:8000/api/v1 porque el cliente recibe rutas relativas a ese prefijo; no añadirlo dos veces. |

### Validaciones de envío que habrá que adaptar al integrar

- Dirección: de 5 a 255 caracteres.
- Teléfono: de 7 a 32 caracteres, con patrón `^[0-9+() -]{7,32}$`.
- Ciudad y departamento: de 2 a 120 caracteres cada uno.
- Las líneas de pedido conservan cantidad entre 1 y 20.

La validación actual de teléfono del frontend (7–10 dígitos) es más restrictiva;
la integración deberá alinearla al nuevo contrato. No se modificó el formulario
de demostración en esta revisión. Nombre completo y correo no son campos de
CheckoutIn: no asumir que el servidor almacena un destinatario distinto del usuario.

## Comprobaciones históricas del 11 de noviembre

| Tema | Evidencia y decisión frontend |
| --- | --- |
| URL de desarrollo | Usuario confirma `http://127.0.0.1:8000/api/v1`. `.env.development` la configura; `.env.local` puede sobrescribirla. `VITE_API_URL` incluye el prefijo una sola vez. |
| Conectividad | `GET /api/v1/health` respondió 200 con un objeto de cadenas: status, app y environment. |
| CORS de desarrollo | GET de salud con Origin `http://localhost:5173`, OPTIONS de `/auth/register` para POST/content-type y OPTIONS de `/orders` para POST/authorization,content-type respondieron 200 y permitieron ese origen y encabezados. El preflight no prueba que el JWT o los permisos sean válidos. No se extrapola a otros puertos u orígenes. |
| Carrito anónimo | `GET /api/v1/cart` sin token respondió 401. No se probaron credenciales ni se crearon cuentas. |
| Lectura de inventario | `GET /api/v1/inventory` sin token respondió 200. Fue pública en la instancia probada ese día; el contrato del 18 de noviembre ahora declara Bearer y falta volver a comprobar la instancia actual. El frontend no puede proteger una API pública ocultando botones. |
| Formato observado del catálogo | GET `/catalog` respondió con `items` y `count`. Un elemento tenía id, slug, name, description, price, category, sizes, image, featured, quantity, reserved, available e is_active. No incluía stock_by_size, requerido por ProductOut; no reutilizar ese esquema a ciegas para catálogo. |
| Formato observado del inventario general | GET `/inventory` respondió una lista plana de filas con product_id, size, quantity, reserved y available, no una agrupación por producto. Esta forma sigue sin estar tipada en OpenAPI. |
| Login y errores | OpenAPI especifica formulario username/password para login y TokenOut con usuario para login/registro. El cliente admite formulario, JSON, Bearer explícito y detail como texto, objeto de negocio o lista de validaciones 422. |
| Duración de reserva | La descripción de POST `/orders` declara 15 minutos. La UI deberá usar el reservation_expires_at recibido; no inventar el vencimiento desde el reloj del cliente. |

Las comprobaciones no crearon usuarios, pedidos, ajustes, pagos o notificaciones.
Las respuestas observadas sirven como evidencia de esa instancia y no sustituyen
los contratos tipados, pruebas de negocio o autorización con diferentes usuarios.

## Cliente HTTP incorporado

- `src/shared/api/apiClient.ts`: fetch nativo, URL configurable, JSON/formulario,
  Bearer por solicitud y retorno unknown para exigir validación por funcionalidad.
- Errores distinguen HTTP, red, tiempo de espera y respuesta incompatible. Conservan
  código de negocio, estado, producto afectado si se identifica y rutas/mensajes
  de validación; no guardan input, ctx o
  cuerpos completos de errores. No registran datos personales o credenciales.
- Cancelación y límite de espera de 10 segundos. No hay reintentos automáticos de
  operaciones que podrían duplicar pedidos. Un fallo de red del navegador no
  permite distinguir por sí solo caída del servidor, conexión o CORS.
- No almacena tokens ni añade autenticación a solicitudes públicas. Las respuestas
  401 y 403 quedan disponibles para que la futura lógica de sesión las trate.
- `getApiBaseUrl` lee VITE_API_URL. Las variables VITE_* son públicas y no deben
  contener secretos. No hay URL fija dentro de las funcionalidades.

## Comprobación desde el navegador

Administración → Conexión API (`/admin/connection`) consulta únicamente GET `/health`
al pulsar «Comprobar conexión». Muestra carga, respuesta o error y permite repetir
la lectura. Salir cancela la operación. Una respuesta correcta no demuestra que
registro, permisos, stock o pagos funcionen. Registro/login y catálogo ya tienen sus integraciones descritas más abajo; las operaciones de negocio restantes siguen en demo.

Para otra dirección: copiar `.env.example` a `.env.local`, configurar VITE_API_URL y
reiniciar Vite. Para un build de producción, definir esa variable al construir;
`.env.development` solo corresponde al desarrollo. No usar una URL local como si
fuera accesible desde otros equipos o desde una web publicada.

Las pruebas de navegador automatizadas interceptan salud para reproducir éxito,
fallo HTTP, respuesta incompatible y fallo de red; no requieren el servidor activo.
Eso se distingue de las comprobaciones HTTP reales documentadas arriba.

## Aclaraciones posteriores del equipo y autenticación integrada

El mensaje técnico posterior del 18 de noviembre confirma registro JSON con name,
email y password; login OAuth2 con username/password y perfil Bearer en users/me.
El frontend incorpora esos tres endpoints. Valida las respuestas antes de iniciar
sesión y toma el usuario/rol del perfil, no de un rol enviado por el formulario.

AuthProvider comparte la sesión en memoria entre rutas. No se almacena el JWT ni
las credenciales en localStorage o sessionStorage: recargar exige iniciar sesión.
El exp del JWT guía el vencimiento visual; su lectura no verifica firma ni concede
permisos. El servidor sigue verificando cada solicitud. Cerrar sesión elimina el
token del cliente; no revoca el JWT en backend. No hay refresh ni logout remoto.
Al cambiar identidad, salir o vencer se limpian el borrador personal de checkout,
pedidos y avisos locales; el carrito de demostración se conserva.

Los formularios evitan envíos simultáneos, limpian contraseñas al terminar y
muestran errores accesibles. Si registro fue aceptado pero falló verificar perfil,
se ofrece iniciar sesión sin repetir automáticamente el alta. Un fallo de red
puede dejar incierto el resultado; tampoco se reintenta automáticamente.

### Aclaraciones resueltas

- Pedidos: created_at y reservation_expires_at son hora local del proceso backend
  sin zona. Mostrarlas sin interpretarlas como UTC. El JWT sí usa UTC y vence a
  las 12 horas; usar su exp, no iniciar otro plazo desde el navegador.
- Destinatario: nombre/correo proceden del usuario autenticado; no hay destinatario
  alternativo. GET de un pedido ajeno devuelve 404. No hay listado GET /orders.
- stock_by_size de productos expresa disponibilidad, no existencia física.
  Catálogo solo contiene totales; inventario por talla informa quantity/reserved/available.
- Ajustes por talla pueden crearla; new_quantity representa físico y no baja de
  reservado. quantity de alta de producto no reparte existencias por talla.
- Usar solo is_active al escribir; evitar enviar ambos alias active/is_active.
- Crear pedido no tiene idempotencia ni recuperación por listado: no repetir un
  POST de resultado incierto. Pago puede reintentarse para el mismo order_id;
  consultar el pedido antes de interpretar un fallo de comunicación como rechazo.
- Backend distingue 401 de sesión inválida y 403 de permisos insuficientes.

### Discrepancias que quedan por conciliar

El mensaje posterior dice POST /orders con solo items y sin campos de envío,
pero OpenAPI exige shipping_address, shipping_phone, shipping_city y
shipping_department. También declara inventario público, mientras Swagger exige
Bearer. No se inventará un contrato combinado: actualizar Swagger o comprobar la
instancia correspondiente antes de conectar esos flujos. Las validaciones de envío
anteriores describen Swagger, no una integración ya activa.

### Alcance pendiente

Las operaciones administrativas continúan siendo demostraciones y están
etiquetadas así. La navegación ya exige sesión con rol administrador. Falta respuesta global a 401 en
futuras operaciones protegidas y conexión de catálogo, carrito, pedidos, pagos,
inventario y notificaciones. La UI no sustituye permisos del servidor.

Build, lint, pruebas unitarias y pruebas de navegador con respuestas interceptadas
verifican el cliente; no certifican registro, permisos o pagos del servidor real.

### Comprobación real del bloque de autenticación

El 18 de noviembre se ejecutaron POST /auth/login y GET /users/me contra
http://127.0.0.1:8000/api/v1 usando la cuenta administrativa de desarrollo facilitada
por el equipo. Ambos completaron el servicio frontend y validaron el perfil con
rol administrador. No se imprimieron ni persistieron token/contraseña, ni se crearon
usuarios o datos de negocio. Esta comprobación Node no verifica CORS en navegador
ni permisos de cliente/administrador en las otras operaciones.

Verificación frontend de este bloque: build, lint y suite unitaria correctos;
33 pruebas Playwright correctas en escritorio, tableta y móvil (autenticación,
contraste/navegación y regresión de pedidos demo). Incluyen revisión automatizada
axe de las pantallas de autenticación; no sustituye revisión manual completa.


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

Validación de este bloque: build y lint sin errores ni advertencias, suite unitaria
correcta (incluye destinos de retorno permitidos). La suite completa de navegador
tuvo 176 casos correctos y un fallo por selector ambiguo de leyenda de foto durante
la transición listado/detalle en móvil. Se corrigió la espera y el alcance del
selector; los 6 casos de fotos se repitieron correctamente en los tres tamaños.
Las pruebas de acceso cubren visitante, cliente, rol desconocido, administrador,
cierre, recarga y vencimiento; usan respuestas interceptadas, no permisos reales
del servidor.


## Catálogo público integrado

Listado GET /catalog y detalle GET /products/{id} ya usan la API sin Bearer.
Se validan precios COP enteros, identidad, actividad, fotos y stock_by_size;
no se consulta inventario administrativo ni se deduce disponibilidad por talla
desde totales. El carrito y la compra reales siguen pendientes: no se mezclan
productos del servidor con el carrito local. Demostración accesible mediante
?source=demo; producción/desarrollo usan API por defecto.

Comprobación de lectura contra http://127.0.0.1:8000/api/v1: listado válido con
12 productos y primer detalle válido con 5 tallas. No se modificaron datos.
La prueba Node no certifica CORS ni descarga de imágenes en navegador real. Las
pruebas Playwright interceptan listado, detalle y fotos para verificar los estados.

Validación frontend: build, lint y suite unitaria correctos. Los 48 casos Playwright
de catálogo API, catálogo demo, carga/error, fotos y carrito pasaron en escritorio,
tableta y móvil. Incluyen revisión axe y ausencia de desbordamiento en detalle API.
