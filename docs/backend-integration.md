# Integración con backend: evidencia y cuestiones abiertas

Actualización del 19 de noviembre: el OpenAPI servido por la instancia local
define CheckoutIn con solo items; no incluye campos de envío. La discrepancia
con el archivo adjunto queda resuelta para esa instancia, como se documenta al final.

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
desde totales. El carrito real se integra en el bloque siguiente; la compra real continúa
pendiente. No se mezclan productos del servidor con el carrito local. Demostración accesible mediante
?source=demo; producción/desarrollo usan API por defecto.

Comprobación de lectura contra http://127.0.0.1:8000/api/v1: listado válido con
12 productos y primer detalle válido con 5 tallas. No se modificaron datos.
La prueba Node no certifica CORS ni descarga de imágenes en navegador real. Las
pruebas Playwright interceptan listado, detalle y fotos para verificar los estados.

Validación frontend: build, lint y suite unitaria correctos. Los 48 casos Playwright
de catálogo API, catálogo demo, carga/error, fotos y carrito pasaron en escritorio,
tableta y móvil. Incluyen revisión axe y ausencia de desbordamiento en detalle API.


## Carrito autenticado integrado

GET/POST /cart y PUT/DELETE /cart/{product_id} usan Bearer de la sesión en memoria.
Se envía siempre talla, incluida la query de eliminación. CartOut es la fuente de
cantidades, actividad e importes COP; se rechazan líneas duplicadas o sumas
incompatibles antes de mostrarlas. Carrito y catálogo demo permanecen separados.
No se implementó vaciar todo: retirar por línea cubre el bloque actual.

Un fallo de escritura bloquea nuevos cambios hasta consultar el estado; no hay
reintentos automáticos ni deducciones locales. 401 descarta sesión y datos privados;
403 conserva sesión y presenta error. Cambio de cuenta cancela solicitudes y
elimina el estado previo; no se guardan carrito, token o datos personales en
localStorage/sessionStorage. El contador muestra la última respuesta confirmada,
no una consulta automática en cada pantalla. Se consulta al abrir carrito o agregar.

Comprobación real de solo lectura: login de desarrollo y GET /cart válidos con
carrito vacío. No se agregaron, editaron o eliminaron artículos reales. Las
escrituras y errores se verifican con API interceptada en navegador; no sustituyen
pruebas de stock, concurrencia, permisos y persistencia del backend.

Validación: build, lint y suite unitaria correctos. Pasaron 75 pruebas de carrito
API/demo, catálogo API, login, registro y acceso administrativo en los tres tamaños.
Después pasaron los 18 casos ampliados de carrito API, incluidos cambio de cuenta
con respuesta pendiente y artículo inactivo; 24 regresiones de carrito demo,
contraste/navegación y borrador de checkout; y 3 comprobaciones finales del contador.
Antes de consultar el carrito, el contador muestra «—» y su nombre accesible indica
«consultar», en lugar de afirmar que hay cero artículos. La revisión axe del
carrito real y las comprobaciones de foco y desbordamiento también pasaron.


## Administración de productos integrada

GET /products público valida la lista completa devuelta por el servidor sin
reconstruirla desde catálogo. POST/PUT de productos y PATCH deactivate envían Bearer
del administrador. No se añade un filtro de inactivos no documentado ni se supone
que el listado incluye productos que el servidor decida omitir. Después de cada
escritura la tarjeta usa ProductOut confirmado; una consulta posterior reemplaza
el listado con la respuesta nueva.

Alta: quantity=0 e is_active=true, sin alias active. Update: omite quantity y ambos
campos de actividad; desactivar emplea la ruta dedicada. No crea stock por talla
al declarar sizes. Foto: solo URL/ruta; el contrato no ofrece subida de archivos.
El borrador usa precios COP enteros sin redondeo silencioso.

Se incorporan cancelación, errores 409/422, cierre en 401 y mensaje 403. Resultado
incierto de escritura bloquea cambios hasta recuperar GET /products y limpiar el
formulario; nunca se reenvía automáticamente un alta.

Comprobación de solo lectura real: GET /products válido con 12 productos. Las
operaciones de alta, actualización y desactivación se prueban con API interceptada;
no se modificaron productos reales ni se validó concurrencia/autorización del
servidor con estas pruebas. Inventario administrativo y compra siguen pendientes.

Verificación frontend del bloque: build, lint y suite unitaria correctos. Pasaron
42 pruebas Playwright de productos API/demo, fotos, acceso administrativo y
navegación; después se revalidaron 18 casos ampliados de productos API, incluidos
retorno desde login conservando fuente y cancelación sin escritura. En escritorio,
tableta y móvil se comprobaron foco, desbordamiento y revisión automatizada axe.


## Inventario administrativo integrado — 19 de noviembre de 2026

GET /inventory y POST /inventory/adjustments envían Bearer y usan los contratos
tipados de filas por talla y respuesta del ajuste. GET /products aporta nombres y
productos aún sin inventario. La discrepancia documental de consulta pública frente
a Bearer permanece: enviar el token en la pantalla administrativa es compatible
con ambos comportamientos y no demuestra que el endpoint rechace anónimos.

Se ajusta físico absoluto con talla y motivo explícitos; cero y talla nueva son
válidos. Se valida reservado de la última consulta como ayuda, pero las cifras de
la respuesta confirmada prevalecen. No se fuerzan reservas a su valor anterior ni
se toman los disponibles de stock_by_size como físico. Una respuesta de otra talla,
producto o cantidad y una fila con aritmética incompatible se rechazan.

Se manejan 401/403/409/422, cancelación y resultado incierto sin repetir ajustes.
Recuperar una consulta tras resultado incierto desbloquea operaciones y limpia el
formulario. No se crea un historial ficticio de actor, fecha o ajuste: el contrato
de respuesta no proporciona esos datos. El laboratorio demo sigue separado.

Intento de comprobación contra http://127.0.0.1:8000/api/v1 el 19 de noviembre:
la conexión devolvió error de red durante login, por lo que no fue posible validar
lecturas en la instancia local en esta revisión. No se realizaron ajustes reales.
Las pruebas de comportamiento usan respuestas interceptadas y no certifican stock,
concurrencia ni permisos efectivos del backend.

Verificación frontend: build, lint y suite unitaria correctos. La suite de navegador
inicial tuvo 75 casos correctos y 3 fallos por una expectativa antigua del aviso
«administración sin protección». Se actualizó esa prueba al aviso de demo protegida.
La revalidación final de inventario API/demo tuvo 36 casos correctos en escritorio,
tableta y móvil, incluyendo permisos de escritura 401/403, errores, cero/talla nueva,
reservas concurrentes, foco, desbordamiento y comprobación automatizada axe.


## Bandeja e intentos de notificación — 19 de noviembre de 2026

GET /notifications y POST /notifications/{id}/read usan Bearer. El frontend valida
que cada aviso pertenezca al usuario del perfil, evitando mostrar una respuesta
con avisos ajenos. El POST solo tipa un objeto abierto: no se asume un campo status
o is_read en su acuse; GET posterior confirma lectura. Un fallo después de enviar
exige consultar antes de repetir, sin reintentos automáticos.

GET /notifications/attempts se presenta en administración, con permisos de
navegación y tratamiento de 401/403. Se conserva el listado plano del contrato y
los IDs nulos; no se inventa agrupación histórica por destinatario ni éxito de
entrega. No hay acciones de envío o reintento. Filtros se derivan de result sin
restringirlo a estados de ejemplo.

Datos privados se mantienen en memoria y se limpian al salir/cambiar sesión.
Fechas se muestran sin conversión ni suposición de zona: la aclaración previa
de hora local del proceso se refería a pedidos, no define la zona de estos campos.
No se guardan credenciales, mensajes o detalles de error en almacenamiento local
ni se registran sus contenidos en consola.

Comprobación real de solo lectura: login de desarrollo, GET /notifications y
GET /notifications/attempts completaron los adaptadores con ambas listas vacías.
No se marcaron avisos reales, no se enviaron mensajes y no se comprobó entrega SMTP.
Pruebas con API interceptada cubren marcado, estados y fallos; no certifican
autorización efectiva ni recepción de mensajes del backend.

Verificación frontend del bloque: build, lint y suite unitaria correctos. Los
63 casos Playwright de notificaciones API/demo, intentos, login y acceso
administrativo pasaron en escritorio, tableta y móvil. Incluyen lectura confirmada
por GET, acuse sin confirmación, resultado incierto, avisos ajenos, logout, filtros,
401/403, vacío/reintento, fechas sin conversión, foco, desbordamiento y revisión axe.


## Consulta de pedidos y contrato desplegado — 19 de noviembre de 2026

Se incorpora GET /orders/{id} con Bearer, validación de propietario e identidad,
404 genérico y errores 401/403. No se llama GET /orders porque no existe listado
en el contrato. /orders ofrece un formulario local de búsqueda por ID y el detalle
se abre desde notificaciones reales. Datos históricos, importes, estados y fechas
proceden del pedido, sin reemplazarlos por catálogo ni deducir expiración o pago.
Los pedidos demo se enlazan explícitamente con source=demo.

La consulta pública http://127.0.0.1:8000/openapi.json respondió con versión 0.1.0.
El CheckoutIn de esa instancia tiene una única propiedad, items, también única
obligatoria. OrderOut contiene id, user_id, status, reservation_state, total,
reservation_expires_at, created_at, items y payment; no contiene campos de envío.
Esto coincide con la aclaración textual del backend y difiere de openapi (1).json.
Las advertencias anteriores sobre la contradicción describen la revisión histórica:
para integrar esa instancia se usará el contrato desplegado con items únicamente.
Solicitar al equipo actualizar el archivo distribuido sigue siendo conveniente,
pero ya no bloquea preparar la creación de pedidos contra este servidor.

No se crearon pedidos ni se probaron pagos; tampoco se enumeraron IDs de pedidos
reales. La comprobación real de este bloque fue la lectura del contrato público.
El detalle de pedidos poblados y sus errores se verifican con API interceptada.
El adaptador tolera campos de envío anulables del Swagger anterior al leer, pero
no los inventa cuando el servidor no los devuelve.

Validación frontend: build, lint y suite unitaria correctos. Pasaron 54 pruebas
Playwright de consulta de pedidos API/demo, notificaciones y revisión de checkout
en escritorio, tableta y móvil. Incluyen login con retorno, actualizaciones solo
GET, protección de datos ajenos, 401/403/404, reintento, fechas, foco, revisión axe
y ausencia de desbordamiento.


## Creación de pedidos integrada — 19 de noviembre de 2026

Se reconsultó http://127.0.0.1:8000/openapi.json antes de implementar: CheckoutIn
solo define items. Las líneas exigen cantidad 1–20. La descripción de POST /orders
confirma creación pendiente de pago con reservas por talla durante 15 minutos;
la UI conserva reservation_expires_at recibido y no calcula un plazo nuevo.

El carrito real abre una revisión autenticada; POST /orders envía únicamente
items con product_id, quantity y size. Se valida respuesta/propietario antes de
presentar el pedido. El frontend no descuenta stock, crea avisos falsos, vacía el
carrito por suposición ni interpreta crear como pagar. Tras éxito vuelve a
consultar GET /cart y ofrece el detalle real. Preparar otro pedido exige una
acción explícita y una nueva revisión.

No existen idempotencia ni listado para recuperar creación sin ID. Se conserva
estado entre rutas y una marca anónima por pestaña en sessionStorage, escrita
antes del POST, sin datos personales ni credenciales. Resultado incierto bloquea
nuevas creaciones incluso tras recargar. Un rechazo HTTP 4xx conocido (salvo 408)
limpia la marca, pero obliga a consultar carrito antes de revisar de nuevo. Un
5xx, red, timeout, 408 o respuesta incompatible no permite reintentar el POST.
Un ID propio recibido en respuesta incompatible puede recuperarse mediante GET;
si no hay ID, la UI no inventa recuperación por carrito, fecha o enumeración.

El marcador es genérico de la pestaña y puede bloquear otra cuenta sin revelar
información de la anterior. Se mantiene tras logout si la solicitud quedó sin
confirmar. No protege globalmente entre pestañas/dispositivos ni reemplaza una
Idempotency-Key de backend. Si el navegador impide escribir la marca, no se
despacha la solicitud. El resultado con referencia solo vive en memoria.

Comprobación real de este bloque: lectura del OpenAPI público, sin POST de negocio.
La creación, rechazos y recuperación se prueban con API interceptada. No se crearon
pedidos, no se reservaron unidades reales y no se realizaron cobros. El pago del
pedido queda para un bloque posterior.

Verificación: build, lint y suite unitaria correctos; 69 pruebas Playwright de
creación, carrito API, detalle de pedidos y checkout demo correctas en los tres
tamaños. Incluyen doble envío, navegación, persistencia de marca tras recarga/login,
recuperación por ID sin otro POST, 409/401/403, validaciones de líneas, foco, axe
y ausencia de desbordamiento.


## Pago de prueba integrado — 19 de noviembre de 2026

Se reconsultó OpenAPI de la instancia local. POST /orders/{id}/checkout recibe
CheckoutPaymentIn con method y card_token; documenta tok_ok y tok_declined.
OrderStatus y ReservationState confirman pendiente_pago/activa como estados de
pedido pendiente con reserva. La pantalla está claramente identificada como
pasarela de prueba del backend; no se integra un PSP bancario de producción.

La creación y el detalle enlazan a la pantalla de pago. El frontend consulta el
pedido, envía solo method=card/card_token y confirma mediante otro GET del mismo
ID. Validación de propietario e ID se aplica a ambas respuestas. No se envían
importe ni estados de pedido/pago; no se llaman webhook, process-expired o
endpoints de administración. No se recalcula una expiración desde fecha naive.

La sesión mantiene un bloqueo de escritura entre rutas. Fallo o respuesta
incompatible exige GET explícito antes de otro intento; no hay auto POST ni
creación de pedido nuevo. Un GET pagado con pago aprobado/pagado muestra éxito;
rechazo proviene de los estados consultados, no de seleccionar tok_declined.
Un POST aprobado con GET pendiente no muestra aprobación. Después de recarga
se exige nueva lectura; idempotencia global y concurrencia son del servidor.

La comprobación real de este bloque fue únicamente lectura del OpenAPI público.
No se ejecutaron pagos, cobros, cambios de pedido o ajustes de stock reales. Las
respuestas pobladas, escenarios de pasarela y errores se verifican interceptando
API en navegador. Integración de un proveedor bancario real queda fuera del
contrato disponible y no se presenta como completada.

Verificación: build, lint y suite unitaria correctos. La suite inicial tuvo
54 casos correctos y 3 fallos de una expectativa de prueba sobre un role=status
que se conserva vacío. Se corrigió la espera y se ampliaron los casos de pago.
La revalidación final tuvo 24 casos correctos en escritorio, tableta y móvil,
incluyendo confirmación por GET, POST aprobado con GET pendiente, rechazo, respuesta
perdida, reintento manual sobre el mismo ID, navegación, permisos, elegibilidad,
foco, revisión axe y ausencia de desbordamiento.
