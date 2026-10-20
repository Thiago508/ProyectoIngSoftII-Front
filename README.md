# Fashion Online Store

Proyecto académico de tienda de ropa femenina con React, TypeScript y Vite.
El proyecto desarrolla el frontend de **F-01: Realizar pedido** (antes RF5) mediante
un carrito y una operación de creación explícitamente simulados. No completa F-01 en producción: todavía no existe una integración de backend.
La referencia actual es `PR - TiendaRopa.xlsx`, recibida el 19 de octubre de 2026.

## Ejecutar el proyecto

El desarrollo de esta sesión utilizó Node 22.23.1. Las versiones resueltas de las
dependencias están en `package-lock.json`.

```sh
npm ci
npm run dev
```

Abrir la URL indicada por Vite y entrar a `/checkout`.

| Comando | Propósito |
| --- | --- |
| `npm run build` | Comprobar TypeScript y generar `dist/` |
| `npm run lint` | Revisar el código con Oxlint |
| `npm test` | Probar validaciones, navegación y operación simulada |
| `npm run test:e2e` | Probar el flujo en Chromium de escritorio y móvil emulado |
| `npm run preview` | Servir el resultado de un build local |

Modificar archivos en `src/`; `dist/` es salida generada y se excluye de Git.

## Flujo implementado

| Ruta | Contenido | Condición de acceso |
| --- | --- | --- |
| `/checkout` | Datos personales y dirección de envío | Borrador editable |
| `/checkout/summary` | Productos, datos y creación simulada | Datos válidos, sin exigir método de pago |
| `/checkout/payment` | Selección de método de pago de demostración | Pedido ya creado |

El stepper usa **Datos y envío → Resumen → Selección de pago**. Se unieron Datos y Envío porque
el mockup los presenta en el mismo formulario y no define otra pantalla de envío.
La raíz abre el catálogo; las rutas desconocidas todavía redirigen al checkout.

Volver entre etapas conserva lo escrito y el método elegido. Recargar elimina el
borrador y el pedido simulado: todo vive en memoria, sin localStorage ni envío de
datos personales a una API. El acceso directo sin requisitos vuelve a la etapa
correspondiente.

Durante la creación, el botón bloquea envíos repetidos y la navegación a etapas
anteriores vuelve al resumen. Tras un error se puede reintentar o editar. Después
de crear, se permite consultar el pedido o seleccionar un método; las rutas de
edición vuelven al pedido creado para evitar modificarlo.

## Arquitectura para la entrega

```text
src/
  App.tsx                         Router de la aplicación
  features/checkout/
    CheckoutFlow.tsx              Estado y coordinación entre rutas
    components/CheckoutStepper/  Indicador de avance
    pages/                       Formularios y resumen
    types/checkout.types.ts      Modelos TypeScript locales
    utils/                       Validación y reglas de acceso
    demo/                        Carrito y creación simulados
    paymentMethods.ts            Opciones del mockup
  shared/components/
    CustomerHeader/              Header compartido
```

`App.tsx` permanece en su ubicación original. `CheckoutFlow` mantiene el borrador,
el método, el pedido y los estados de la operación asíncrona. Renderiza un único
header y pasa valores y callbacks a las páginas por props. Esa comunicación es
suficiente para tres pantallas; no requiere Context, Redux ni Zustand.

Las páginas representan la interfaz. Las funciones de validación y navegación
contienen reglas comprobables sin renderizar React. `demo/createDemoOrder.ts`
encapsula la simulación para sustituirla cuando haya un contrato real de backend;
no representa un endpoint ni garantiza disponibilidad o concurrencia.

React Router ya estaba instalado. Playwright y axe se añadieron solo como dependencias de
desarrollo para comprobar comportamiento real en navegador. No se añadieron otras
bibliotecas de estado, formularios o peticiones.

## Validación y accesibilidad

El formulario normaliza espacios antes de validar y continuar, conserva la
semántica de los campos y usa `noValidate` para mostrar sus propios mensajes.
Solo admite nombres de campo del modelo. Los errores incluyen `aria-invalid`,
`aria-describedby` y foco en el primer campo inválido.

Reglas iniciales de interfaz: nombre de al menos 3 caracteres, correo de formato
básico, teléfono de 7 a 10 dígitos sin espacios, dirección de al menos 5 caracteres,
ciudad y departamento obligatorios. No validan identidad, existencia del correo,
entrega en una localidad ni formatos internacionales de teléfono.

Hay labels, autocomplete, radios nativos, foco visible, salto al contenido y
anuncios de creación. La fecha usa `time` y la zona `America/Bogota`. Búsqueda,
perfil y carrito están identificados como pendientes y deshabilitados; el contador
refleja las unidades del carrito de demostración.

## Simulación y regla de inventario

`demo/demoCart.ts` contiene tres productos del mockup. El subtotal de productos es
**$219.700 COP**. El envío está pendiente de definir y no se incluye en el subtotal.

La creación tarda medio segundo de forma explícitamente simulada. El checkbox
«Simular error de creación» permite comprobar fallo y reintento. El éxito devuelve
una copia de los datos con referencia `DEMO` y estado `pending_payment`.

**Crear el pedido no aprueba el pago ni descuenta inventario.** El inventario se
descuenta solo después de una aprobación verificada por el backend. El documento actualizado exige reservar al registrar y liberar al cancelar o
expirar; esa operación transaccional corresponde al backend. No se implementaron
reservas en el frontend ni se inventó su duración. Un clic, una redirección y el estado local
no constituyen evidencia de pago aprobado.

Las opciones de pago proceden del mockup, incluida contra entrega; no acreditan
su disponibilidad real. La selección se ofrece después del registro del pedido. F-06 deberá verificar
reserva vigente e importe del servidor antes de iniciar un intento de pago; la
pantalla actual no realiza ese intento. No se recogen números de
tarjeta ni CVV.

## Pruebas y revisión

Para instalar el navegador y ejecutar las pruebas:

```sh
npx playwright install chromium
npm run test:e2e
```

En esta sesión Chromium está en `/tmp/fashion-playwright`:

```sh
PLAYWRIGHT_BROWSERS_PATH=/tmp/fashion-playwright npm run test:e2e
```

Playwright inicia su propio Vite en el puerto 4173. Comprueba errores y foco,
conservación del borrador, acceso directo, recarga, fallo/reintento, historial y
desbordamiento horizontal. La suite se amplía por funcionalidad y se ejecuta en
escritorio, tablet y móvil emulado. No equivale a Safari ni a un iPhone físico.

El caso de teclado guarda `datos.png` y `resumen.png` por proyecto en
`test-results/`, junto a las trazas de fallos. Los artefactos se excluyen de Git.

Para una demostración manual:

1. Enviar el formulario vacío y corregir sus errores.
2. Completar datos, continuar a Resumen y volver a editar: comprobar conservación.
3. Revisar productos y subtotal; simular un fallo y reintentar.
4. Durante la creación pulsar Atrás: debe permanecer en Resumen.
5. Comprobar referencia DEMO y estado pendiente de pago. Abrir la selección de
   pago, elegir método y guardar: el pedido debe continuar pendiente, sin cobro.
   Recargar para demostrar que no existe persistencia.
6. Recorrer con Tab, Shift+Tab y flechas; comprobar los anuncios con lector de
   pantalla. Esta última revisión sigue siendo manual.

## Trabajo pendiente fuera de la demostración

- Acordar el contrato real de creación y consulta del pedido con backend.
- Recibir el carrito real de F-05 y validar en backend precios y disponibilidad.
- Definir costo de envío y política de los métodos de pago.
- Integrar F-06 y confirmar pagos desde una fuente verificada; después actualizar
  inventario con control de concurrencia en backend.
- Definir persistencia y autorización con el equipo antes de guardar datos.

El checkout no implementa autenticación ni seguimiento. Las demostraciones de
administración y catálogo se documentan en sus apartados posteriores. No se inventaron endpoints ni se publicaron cambios en Jira o hosting.

La revisión visual y accesible, sus correcciones y la prueba auditiva pendiente están
en [docs/checkout-review.md](docs/checkout-review.md). La suite de revisión añade
24 análisis axe y capturas de Pago, errores y resultado en los tres tamaños.

## Incremento F-01: carrito vacío y disponibilidad

En Resumen, el selector «Escenario del carrito (demostración)» permite probar:

- Carrito válido: los tres productos del mockup.
- Carrito vacío (SWR-01): muestra un mensaje, subtotal cero y botón de creación
  deshabilitado. La función de creación también lo rechaza si se invoca directamente.
- Disponibilidad insuficiente al confirmar (SWR-02): la operación simulada rechaza
  la creación e identifica el vestido talla M. No genera referencia de pedido.

Restaurar «Carrito válido» limpia el rechazo y permite reintentar. Los datos y el
método se conservan. El selector y el error genérico son controles de demostración;
no representan gestión del carrito F-05 ni una consulta real de existencias.

La página recibe los artículos por props desde `CheckoutFlow`. El error específico
`DemoAvailabilityError` pertenece a la simulación; no define un contrato de API.
Los tests verifican rechazo, artículo afectado, ausencia de pedido, conservación del
carrito y recuperación. La revisión de navegador incluye axe y capturas para los
dos estados nuevos: ocho estados por tres tamaños (24 análisis).

## Separación de F-01 y F-06

F-01 ya no exige un método de pago: Datos y envío lleva directamente a Resumen.
`DemoOrder` y `createDemoOrder` registran el borrador sin ese dato. Una vez creado,
se ofrece la pantalla existente de selección como demostración separada. Guardar
el método conserva una preferencia en memoria y vuelve al pedido, sin cambiar su
estado ni su referencia. Acceder a `/checkout/payment` antes de crear redirige a
Resumen si hay datos válidos, o al formulario si no los hay.

Este cambio sigue el orden del Excel actualizado (SWR-04, SWR-05 y SWR-23). No
simula una reserva vigente ni habilita procesamiento real de pagos. La autorización,
la reserva y el importe deben verificarse en backend antes de integrar F-06.

## Evidencias de F-01 para la entrega

Consultar [la matriz de trazabilidad](docs/f01-traceability.md) para relacionar
SWR-01–05 con pantallas, pruebas y dependencias del backend. Incluye un guion de
demostración y una agenda para acordar la integración, sin inventar endpoints.

En el modelo local, `DemoOrder.subtotal` representa únicamente los productos;
no es un total definitivo de compra. El resumen presenta también el precio unitario.

## Pantallas estrechas y datos largos

`tests/checkout-responsive.spec.ts` recorre edición, resumen, creación y selección
posterior de pago con nombre, correo y dirección largos. Comprueba conservación de
valores, foco y ausencia de desbordamiento horizontal. El caso móvil usa 320 px;
escritorio y tablet amplían el tamaño de fuente raíz al 200 %. Esto prueba texto
ampliado, no equivale a comprobar el zoom completo del navegador o todos los modos
de ampliación de una tecnología de asistencia.

Las capturas `resumen-datos-largos.png`, `resultado-datos-largos.png` y
`pago-texto-ampliado.png` se generan en `test-results/checkout-responsive-…`.
No hicieron falta cambios de CSS para estos casos. La escucha con Orca sigue
pendiente; esta revisión tampoco confirma compatibilidad con dispositivos físicos.

## F-02: Gestionar inventario — consulta inicial

Abrir `/admin/inventory`. El primer incremento cubre la presentación de SWR-06:
existente, reservado y disponible por artículo vendible (SKU y talla), calculando
`disponible = existente - reservado`.

- `src/features/inventory/demo/inventoryDemo.ts`: modelo y ejemplos identificados
  como DEMO; incluye un artículo con todas sus unidades reservadas y otro agotado.
- `src/features/inventory/pages/InventoryPage.tsx`: tabla semántica y explicación
  de cantidades; en móvil permite desplazamiento horizontal dentro de la tabla.
- `tests/inventory.spec.ts`: comprueba cantidades, separación por talla, teclado,
  accesibilidad automática y navegación al checkout en los tres tamaños.

Esta ruta es una demostración administrativa sin protección real. No implementa
login, autorización ni movimientos reales de pedidos y no modifica el carrito de
F-01. No muestra un enlace de administrador en el checkout público. La autorización
por rol deberá verificarse desde backend y después integrarse con F-07.

SWR-07 ya incluye un formulario de ajuste con enteros no negativos,
prohibición de bajar de reservado y registro de cantidad anterior/nueva, motivo,
usuario y fecha. Ese registro es explícitamente simulado hasta la integración.
SWR-08–10 (reservar, liberar y convertir a salida una sola vez) requieren operación
transaccional en backend; no se garantizan modificando contadores en React.

Verificación manual: abrir la ruta, comparar vestido M (15 − 3 = 12) con vestido L
(8 − 8 = 0), comprobar falda sin existencias y recorrer la tabla con teclado en
móvil. Todos los valores son ejemplos locales y no representan stock de la tienda.

## Estilos compartidos y alineación

`src/index.css` define variables de color, ancho de contenido, márgenes laterales y
radios. Checkout e inventario consumen esos valores para mantener una apariencia
coherente sin añadir una biblioteca de estilos ni componentes adicionales.

El header de cliente centra su contenido en un máximo de 1120 px; el buscador
ocupa el espacio entre la marca y las acciones. El formulario conserva su ancho
máximo de 620 px y está centrado de forma independiente. En inventario, cabecera
y contenido comparten los mismos límites; la cabecera oscura distingue administración.
El indicador de foco de los títulos usa el color principal y sigue siendo visible.

## F-02 / SWR-07: ajustes administrativos simulados

En `/admin/inventory`, el formulario permite seleccionar SKU y talla, introducir la
**nueva cantidad total de existencias** y justificarla. Rechaza campos vacíos,
negativos, decimales y cantidades inferiores a reservado. Se limita a enteros seguros
de JavaScript para no perder precisión; no se inventó un máximo de negocio.

`demo/adjustDemoInventory.ts` valida y devuelve los artículos actualizados junto
al registro del ajuste, sin modificar los datos de entrada. `InventoryPage` aplica
ambos en una sola actualización de estado. Reservado no cambia y disponible se
recalcula. No se añade un loading, porque es una operación local síncrona.

El historial presenta SKU, nombre, talla, cantidad anterior/nueva, motivo recortado,
usuario fijo «Administrador de demostración» y fecha en `America/Bogota`. No es una
auditoría persistente ni prueba de autorización. Recargar o salir de la pantalla
restaura los ejemplos y elimina el historial. El checkout continúa independiente.

Prueba: vestido M tiene 15 existentes y 3 reservados. Intentar guardar 2 debe dar
error; guardar 20 con un motivo deja 17 disponibles y añade el registro 15 → 20.
Guardar 3 después deja 0 disponibles y añade 20 → 3. Los tests de lógica y navegador
cubren esos límites, el motivo, el historial, las reservas y el reinicio al recargar.

## F-02 / SWR-08: laboratorio de reservas

En `/admin/inventory`, «Reservas de pedidos — laboratorio de demostración» ofrece
dos pedidos ficticios independientes del checkout:

- `DEMO-PED-001`: vestido M (2) y blusa S (1). Aumenta reservado y reduce disponible,
  manteniendo existente. Repetirlo devuelve un aviso sin sumar otra reserva.
- `DEMO-PED-002`: blusa S (1) y falda M (1). Con los ejemplos iniciales se rechaza
  por falta de falda, y tampoco se reserva la blusa. Si se reabastece la falda con
  el ajuste local, puede reservarse el pedido completo.

`demo/reserveDemoInventory.ts` agrupa cantidades por SKU y comprueba todas las
líneas antes de devolver una copia con la reserva. `InventoryPage` aplica artículos
y reservas en un único estado; los ajustes administrativos conservan ese registro.
`components/InventoryReservationPanel.tsx` contiene solo el laboratorio y sus avisos.
La separación permite revisar la regla sin introducir una API inventada.

Esto ilustra la operación todo-o-nada de SWR-08, no garantiza una transacción entre
compradores. Las reservas reales, autorización y repetición de solicitudes deben
resolverse en backend. No hay vencimiento inventado, descuentos de existencias,
aprobación de pagos ni enlace con pedidos del checkout. Recargar o salir elimina
las reservas simuladas. SWR-09 incorpora cancelación y expiración manuales; SWR-10 incorpora la conversión simulada a salida.

Comprobar: reservar el pedido 001 deja vestido M en 15 existentes / 5 reservados /
10 disponibles. Repetir conserva esas cantidades; intentar ajustar existente a 4
se rechaza. Probar el pedido 002 confirma que no se aplica una reserva parcial.

## F-02 / SWR-09: liberar reservas una sola vez

En el laboratorio, después de reservar un pedido, «Simular cancelación» o «Simular
expiración» devuelve sus unidades a disponible y reduce reservado. Existente no
cambia. Las reservas iniciales de otros pedidos del ejemplo se conservan.

`demo/releaseDemoReservation.ts` comprueba todas las líneas antes de aplicar el
cambio. Cada reserva conserva estado (`active`, `cancelled` o `expired`) y la fecha
de liberación en memoria. Repetir cualquiera de los eventos sobre una reserva ya
liberada devuelve un aviso sin modificar cantidades, motivo o fecha. Reservar de
nuevo el mismo pedido terminal se rechaza. Una reserva inexistente o inconsistente
no produce cambios.

No se inventó una duración: expiración es un evento manual de prueba. En producción
el backend decide y confirma la expiración y garantiza el procesamiento único y
transaccional. Estos botones no cancelan pedidos reales ni notifican a clientes.

Prueba: reservar DEMO-PED-001 lleva vestido M de 3 a 5 reservados. Cancelar o
expirar devuelve a 3 y deja 15 existentes / 12 disponibles. Repetir no libera las
3 unidades iniciales. Recargar restaura todos los datos de demostración.

## F-02 / SWR-10: convertir una reserva activa en salida

«Simular evento de pago confirmado» ilustra únicamente el efecto sobre inventario,
con una reserva activa del laboratorio. **No verifica ni aprueba un pago**, no
procesa cobros y no cambia los pedidos del checkout. En producción la confirmación
auténtica y la vigencia de la reserva deberán verificarse desde backend.

`demo/convertDemoReservation.ts` comprueba todas las líneas antes de descontar
existente y reservado. Conserva disponible y reservas ajenas. La reserva pasa a
`converted` con fecha local; repetir el evento no duplica la salida. Se rechazan
reservas inexistentes, canceladas, expiradas o inconsistentes. Después de convertir,
no se permite liberar ni volver a reservar ese mismo pedido. Esto no implementa
una devolución ni una política de reembolso.

Prueba: reservar DEMO-PED-001 deja vestido M en 15 / 5 / 10. Simular el evento deja
13 / 3 / 10. Repetir conserva 13 / 3 / 10. Cancelar o expirar después se rechaza.
Las pruebas comprueban también pago simulado después de cancelar o expirar.

Estado de F-02: SWR-06–10 tienen demostración frontend y pruebas. La restricción de
rol de SWR-07, persistencia, transacciones y efectos únicos entre solicitudes reales
siguen pendientes de integración. Ver [trazabilidad F-02](docs/f02-traceability.md).

## F-03 / SWR-11: registrar productos

Ruta `/admin/products`, accesible desde la navegación administrativa compartida con
Inventario. El primer incremento permite registrar un producto y consultar el
listado local. Nombre, descripción e identificador son obligatorios y el precio
debe ser mayor que cero. La normalización local guarda el código en mayúsculas y
sin espacios exteriores, rechazando duplicados; esa convención debe acordarse con
backend antes de integrar.

`features/products/demo/productsDemo.ts` contiene el modelo, los ejemplos y la
operación de registro. `ProductsPage` mantiene el estado de la pantalla, validación
y mensajes. `shared/components/AdminHeader` se usa en Productos e Inventario;
ambas pantallas conservan los colores y anchos comunes.

El precio se introduce sin separadores de miles, con hasta dos decimales y coma o
punto decimal, y se representa en centavos enteros. No se admiten valores fuera de
la precisión segura de JavaScript. Registrar crea un producto activo de demostración,
no unidades de inventario, tallas ni líneas de pedidos. Puede incluir una foto opcional
según el incremento documentado al final. El código del producto
no es el SKU de una variante de inventario. No se modifican datos históricos de F-01.

No hay autorización administrativa real ni persistencia tras recarga. Recargar restaura sus ejemplos; navegar entre Productos y catálogo conserva los
registros y sus cambios en memoria. No hay loading ficticio: el registro es síncrono.
SWR-12 (editar) y SWR-13 (desactivar) están implementados como operaciones locales; la integración con backend queda pendiente.

Prueba: enviar vacío para ver errores y foco, intentar `demo-vest` para comprobar
el duplicado y registrar `NUEVO-01` con nombre, descripción y `89900,50`. Comprobar
la tarjeta activa, el aviso y el precio. Navegar a Inventario permite comprobar el
header compartido; volver a Productos conserva los datos locales hasta recargar.

## F-03 / SWR-12–14: edición, desactivación e historial de pedidos

«Editar» carga el registro en el mismo formulario y enfoca el identificador comercial.
«Guardar cambios de demostración» valida los datos y la unicidad, excluyendo el propio
producto; conserva el ID interno y el estado activo/inactivo. «Cancelar edición»
descarta el borrador y devuelve el foco al botón de origen. No se crea una tarjeta
nueva al editar. Los errores no modifican el registro.

«Desactivar» marca el registro como inactivo, conserva sus datos y deshabilita repetir
la acción desde la UI. Editar un producto inactivo no lo reactiva. No hay borrado,
reactivación ni conexión con un catálogo público todavía; impedir nuevas compras
requiere que F-04 y backend excluyan o rechacen productos inactivos.

Las funciones `createDemoProduct` y `updateDemoProduct` reutilizan validación y
normalización. `deactivateDemoProduct` devuelve el estado actualizado sin modificar
los ejemplos. La prueba de SWR-14 registra un pedido, cambia nombre/precio y desactiva
el producto; verifica que la copia histórica del pedido permanece igual. La garantía
persistente de ese historial corresponde al backend.

Prueba: editar DEMO-VEST, intentar usar DEMO-BLUSA para comprobar el duplicado,
guardar nombre/precio nuevos y verificar que siguen dos productos. Desactivar y
volver a editar conserva Inactivo. Recargar restaura la demostración original.

## F-04: consultar catálogo

`/` abre `/catalog`. SWR-15 presenta identificador comercial, nombre y precio de los
productos activos. SWR-17 busca por coincidencia parcial del nombre sin distinguir
mayúsculas; SWR-18 muestra un mensaje cuando no hay coincidencias. El botón de
limpieza restaura el listado. No se eliminaron diferencias de acentuación no
especificadas en el requisito.

`/catalog/:productId` muestra descripción, precio y disponibilidad por talla de
los ejemplos iniciales (SWR-16). Un producto desconocido o inactivo muestra «Producto
no disponible», sin sus datos comerciales. La búsqueda usa `q` en la URL para
conservarla al ir al detalle y volver; escribir no añade una entrada de historial
por letra. Solo se habilita el buscador del header en el listado de catálogo.

`App` mantiene productos y pasa valores/callbacks por props a Productos y Catálogo.
Crear, editar o desactivar en administración se refleja al navegar sin recargar.
No se añadió Context, estado global externo ni almacenamiento persistente.

`features/catalog/demo/catalogDemo.ts` separa filtro y disponibilidad de ejemplo.
La asociación por ID interno es explícitamente local: no es un contrato de API ni
refleja ajustes del laboratorio de Inventario. Un producto nuevo indica disponibilidad
sin confirmar en lugar de recibir stock inventado. F-05 incorpora selección de talla y cantidad y un carrito local en el incremento
posterior. El carrito del header es navegable desde catálogo y carrito; el checkout
conserva por ahora su propia demostración separada.

Prueba: abrir `/catalog`, buscar `MiDi`, abrir el vestido y volver: se conserva la
consulta. Buscar algo inexistente muestra el mensaje y permite limpiar. En
`/admin/products`, desactivar DEMO-VEST y pulsar «Ver catálogo»: el vestido desaparece.
Editar o crear otro producto se refleja en el listado y detalle de la misma sesión.
Recargar restaura los ejemplos. El backend deberá excluir inactivos y comprobar
precios, disponibilidad y autorización en sus propias operaciones.

## Fotos en Productos y Catálogo

El catálogo y el detalle incluyen imágenes con texto alternativo, carga diferida en
listado y alternativa ante imagen ausente o fallida. Los dos ejemplos iniciales usan
imágenes ilustrativas generadas con IA, identificadas en pantalla y guardadas en
`public/images/products/`.

Para usar una foto propia: ir a `/admin/products`, pulsar Editar, seleccionar una
foto JPG/PNG/WebP, revisar «Descripción de la foto» y guardar. El catálogo refleja
el cambio al navegar sin recargar. La foto es opcional; si se adjunta requiere
una descripción accesible. Se puede quitar sin borrar el producto.

Los archivos se leen solo en el navegador (máximo local de 5 MB) y no se suben ni
persisten tras recarga. El botón de guardar se bloquea únicamente durante la lectura
real. No se agregaron dependencias para manejar imágenes. Los detalles, procedencia,
assets y prompts están en [docs/catalog-images.md](docs/catalog-images.md).

## F-05: carrito — agregar, consultar, actualizar y retirar

Desde el detalle de un producto activo en `/catalog/:productId`, elegir talla y una
cantidad entera mayor que cero y pulsar «Agregar al carrito» (SWR-19). En esta
simulación solo las variantes asociadas a los ejemplos y con disponibilidad inicial
positiva pueden seleccionarse. La cantidad no se compara contra un stock real ni
se inventa un máximo comercial; el backend deberá comprobar disponibilidad al
confirmar. Un producto nuevo sin variantes no ofrece la acción.

`/cart` muestra selección, fotos, SKU, talla, unidades, precios y subtotal (SWR-21).
El icono del header de catálogo y carrito muestra la suma de unidades y enlaza a esa
ruta. Agregar la misma variante acumula cantidad sin duplicar la línea. La variante
se identifica por producto y SKU, no solo por su nombre.

`App` mantiene las líneas del carrito en memoria, junto al estado de productos.
`features/cart/cart.ts` valida y devuelve copias, sin modificar productos ni
inventario (SWR-22). El subtotal se calcula en centavos seguros usando el precio
actual del catálogo local. Si esos datos ya no permiten calcularlo, se muestra un
mensaje recuperable en lugar de una pantalla blanca. Un producto desactivado que
ya esté en el carrito se conserva con advertencia; no se considera válido para una
nueva compra. No se crea un pedido ni se reserva stock al agregar.

Cada línea permite guardar una nueva cantidad entera positiva o retirar el artículo
(SWR-20). Una cantidad inválida conserva las unidades y el subtotal anteriores;
«Descartar cambio de cantidad» recupera el valor guardado. Al actualizar o retirar,
el subtotal y el contador se recalculan. Un producto desactivado puede retirarse,
pero su cantidad no puede modificarse. Retirar mueve el foco al siguiente artículo,
al anterior si era el último, o al título del carrito cuando queda vacío. Estas
operaciones tampoco alteran inventario ni reservas.

«Continuar con la compra» conecta `/cart` con `/checkout`: el resumen recibe SKU,
talla, unidades, nombre y precio actuales de esta selección. El acceso con carrito
vacío se bloquea; los artículos inactivos, variantes inválidas o cantidades que
superen la disponibilidad de la instantánea impiden continuar. La comprobación
definitiva, reservas y precios del servidor siguen pendientes de integración.
El pedido creado conserva una copia de sus líneas. El carrito no se vacía ni se
persiste automáticamente. Salir de checkout descarta su borrador y resultado local.
Los escenarios originales del mockup siguen disponibles entrando expresamente por
`/checkout?demo=1`; las pruebas anteriores usan ese modo aislado.
Recargar reinicia el carrito; no se añadió persistencia,
Context, dependencias de estado ni endpoints.

Prueba: abrir el vestido en catálogo, seleccionar M y agregar 2 unidades, agregar
1 más y abrir el carrito desde el contador: una línea con 3 unidades y subtotal
$269.700,00. Volver al catálogo conserva la selección; recargar la reinicia.
Cambiar la cantidad a 0 muestra un error sin cambiar el subtotal; descartar restaura
3. Guardar 2 cambia el subtotal a $179.800,00. Retirar deja el carrito vacío.

Verificación de SWR-20: build, lint y pruebas unitarias correctos; los 12 casos de
carrito en Playwright pasan en escritorio, tablet y móvil, incluyendo cantidades
inválidas, descarte, subtotal, retirada, foco y productos desactivados. La revisión
automatizada con axe no sustituye la prueba manual con lector de pantalla.

Verificación de la conexión con F-01: build, lint y pruebas unitarias correctos.
Los 36 casos de carrito y checkout pasan en escritorio, tablet y móvil tras repetir
la revisión de accesibilidad con 60 segundos para sus múltiples auditorías y capturas.
El flujo del catálogo confirma únicamente las líneas elegidas; el acceso vacío
queda bloqueado y se preservan los centavos al calcular el subtotal.
