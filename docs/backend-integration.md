# Integración con backend: evidencia y cuestiones abiertas

Revisión: 11 de noviembre de 2026. Fuentes: `openapi.json` entregado por el equipo,
«Informe Técnico de Estado Actual del Backend.docx» y comprobaciones HTTP de lectura
contra el servidor local confirmado por el usuario. El OpenAPI documenta contratos;
no certifica por sí solo la implementación o sus reglas de autorización.

## Resuelto o comprobado

| Tema | Evidencia y decisión frontend |
| --- | --- |
| URL de desarrollo | Usuario confirma `http://127.0.0.1:8000/api/v1`. `.env.development` la configura; `.env.local` puede sobrescribirla. `VITE_API_URL` incluye el prefijo una sola vez. |
| Conectividad | `GET /api/v1/health` respondió 200 con un objeto de cadenas: status, app y environment. |
| CORS de desarrollo | GET de salud con Origin `http://localhost:5173`, OPTIONS de `/auth/register` para POST/content-type y OPTIONS de `/orders` para POST/authorization,content-type respondieron 200 y permitieron ese origen y encabezados. El preflight no prueba que el JWT o los permisos sean válidos. No se extrapola a otros puertos u orígenes. |
| Carrito anónimo | `GET /api/v1/cart` sin token respondió 401. No se probaron credenciales ni se crearon cuentas. |
| Lectura de inventario | `GET /api/v1/inventory` sin token respondió 200. La consulta es pública en la instancia probada; confirmar si es la política buscada. El frontend no puede proteger una API pública ocultando botones. |
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
registro, permisos, stock o pagos funcionen. Las demás pantallas siguen en demo.

Para otra dirección: copiar `.env.example` a `.env.local`, configurar VITE_API_URL y
reiniciar Vite. Para un build de producción, definir esa variable al construir;
`.env.development` solo corresponde al desarrollo. No usar una URL local como si
fuera accesible desde otros equipos o desde una web publicada.

Las pruebas de navegador automatizadas interceptan salud para reproducir éxito,
fallo HTTP, respuesta incompatible y fallo de red; no requieren el servidor activo.
Eso se distingue de las comprobaciones HTTP reales documentadas arriba.

## Respuestas que necesita confirmar el equipo de backend

1. **Dinero:** ¿price, unit_price, subtotal, total y amount están en pesos o centavos?
   ¿Qué moneda se aplica y dónde se devuelve? Los enteros del esquema no responden
   esa pregunta. El frontend no hará conversiones reales hasta confirmarlo.
2. **Datos de compra y envío:** ¿qué operación registra destinatario, teléfono,
   dirección, ciudad y departamento, y cómo los vincula al pedido? CheckoutIn solo
   define items. No se enviarán campos adicionales suponiendo que serán guardados.
3. **Contratos genéricos:** tipar la respuesta de catálogo, la lista de inventario y
   el cuerpo de ajustes. Aclarar stock_by_size y cómo crear/modificar tallas y sus
   cantidades, incluyendo precedencia entre active e is_active cuando difieran.
4. **Permisos:** confirmar si inventario debe admitir lecturas anónimas; especificar
   acceso de Cliente/Administrador a los endpoints administrativos, especialmente
   intentos de notificación y ajustes. Verificar autorización en backend.
5. **Fechas:** devolver y documentar zona/offset de created_at y reservation_expires_at
   (preferiblemente ISO con Z u offset). El ejemplo anterior no llevaba zona.
6. **Resultado incierto y sesión:** definir recuperación tras perder la respuesta de
   creación/pago; confirmar duración/expiración del JWT y si existen renovación o
   revocación/cierre en servidor. No figuran rutas de refresh/logout en el OpenAPI.

Con lo conocido ya se puede iniciar el siguiente bloque: integrar registro/login y
consulta del usuario, respetando UserCreate, TokenOut y UserOut. La integración de
precios y datos de envío no debe cerrarse suponiendo las respuestas de esta lista.
