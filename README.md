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

`App.tsx` permanece en su ubicación original y conserva el borrador de datos y
envío junto al estado compartido de la sesión. `CheckoutFlow` recibe ese borrador
y su callback de cambio; mantiene el método, el resultado visual del pago y los
estados de la operación asíncrona. Renderiza un único header y comunica valores
y callbacks por props. No requiere Context, Redux ni Zustand.

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
anuncios de creación. La fecha usa `time` y la zona `America/Bogota`. El encabezado
enlaza al registro de cliente de demostración y al carrito en memoria. La búsqueda
está disponible en catálogo; en el modo aislado `?demo=1` de checkout el contador
corresponde al carrito fijo y su acción permanece deshabilitada.

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
ambos en una sola actualización del estado compartido de sesión. Reservado no cambia y disponible se
recalcula. No se añade un loading, porque es una operación local síncrona.

El historial presenta SKU, nombre, talla, cantidad anterior/nueva, motivo recortado,
usuario fijo «Administrador de demostración» y fecha en `America/Bogota`. No es una
auditoría persistente ni prueba de autorización. Navegar conserva cantidades e
historial; recargar restaura los ejemplos. Catálogo y checkout consultan ahora
estas cantidades. La creación de pedidos no genera reservas automáticamente.

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
los artículos asociados en el inventario de sesión (SWR-16). Un producto desconocido o inactivo muestra «Producto
no disponible», sin sus datos comerciales. La búsqueda usa `q` en la URL para
conservarla al ir al detalle y volver; escribir no añade una entrada de historial
por letra. Solo se habilita el buscador del header en el listado de catálogo.

`App` mantiene productos y pasa valores/callbacks por props a Productos y Catálogo.
Crear, editar o desactivar en administración se refleja al navegar sin recargar.
No se añadió Context, estado global externo ni almacenamiento persistente.

`features/catalog/demo/catalogDemo.ts` separa filtro y disponibilidad de ejemplo.
La asociación por ID interno es explícitamente local, no un contrato de API.
El catálogo refleja los ajustes y reservas del laboratorio de Inventario. Un producto nuevo indica disponibilidad
sin confirmar en lugar de recibir stock inventado. F-05 incorpora selección de talla y cantidad y un carrito local en el incremento
posterior. El carrito del header es navegable desde catálogo y carrito; el checkout
usa la selección compartida, salvo el modo aislado `?demo=1`.

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
simulación solo las variantes asociadas a los ejemplos y con disponibilidad positiva
en el inventario de sesión pueden seleccionarse. La cantidad no se compara contra un stock real ni
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
superen la disponibilidad del inventario de sesión impiden continuar. La comprobación
definitiva, reservas y precios del servidor siguen pendientes de integración.
El pedido creado conserva una copia de sus líneas. El carrito no se vacía ni se
persiste automáticamente. Salir de checkout conserva el borrador de datos y envío hasta crear un pedido
o recargar; la selección visual de pago se descarta. El pedido
creado queda disponible en el detalle de la sesión hasta recargar.
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

## F-06: vista previa de resultados de pago

Después de crear un pedido de demostración, abrir «Seleccionar método de pago
(demostración)» y después «Ver resultados de pago (demostración)». La pantalla
`/checkout/payment/result` permite visualizar un resultado pendiente,
aprobado o rechazado. Cada estado tiene texto propio y una región de estado
accesible. Se muestra la referencia del pedido, el subtotal local y la moneda COP;
ese subtotal no se presenta como importe autorizado por el servidor.

`CheckoutFlow` conserva el escenario visual con `useState` para que sobreviva
a la navegación entre resultado, método de pago y resumen. `PaymentResultPreview`
recibe ese escenario y el pedido para mostrar su referencia e importe, sin funciones
que puedan modificar el pedido. No tiene carga artificial: cambiar el selector es una operación
síncrona. Salir del checkout descarta el resultado visual; el pedido creado
permanece en el detalle de la sesión hasta recargar. La ruta de resultado exige un pedido creado; durante su creación no se
puede abandonar el resumen. Esta
separación permite revisar la interfaz de SWR-26 sin convertir una selección del
cliente en aprobación de pago.

F-06 sigue parcial: no hay intento de pago, registro de resultados, comprobación
de reserva vigente ni importe del servidor (SWR-23); tampoco verificación de una
confirmación (SWR-24) ni aplicación de efectos una sola vez (SWR-25). Esas garantías
requieren backend. El laboratorio conserva el pedido pendiente y no altera stock,
reservas ni métodos de pago seleccionados. No recoge datos de tarjeta.

Prueba manual: crear un pedido, abrir la selección de pago, entrar en
«Ver resultados de pago (demostración)» y cambiar «Resultado a
visualizar (demostración)» entre sus tres opciones. Comprobar los mensajes, volver
al pedido y verificar que conserva su referencia y estado pendiente de pago.
La prueba de navegador cubre los tres tamaños, teclado, ausencia de desbordamiento,
axe, conservación del pedido, del método y del escenario al navegar entre pantallas,
y rechazo del acceso directo o tras recargar sin un pedido creado.

Las reglas de colaboración están en [AGENTS.md](AGENTS.md), incluida la instrucción
de sugerir el commit al final de cada incremento sin ejecutar `git commit`.

## F-07: formulario público de registro de cliente

La acción de usuario del encabezado abre `/register`. Este primer bloque de SWR-27
incluye correo, contraseña y confirmación; no permite elegir un rol. El registro
público se presenta como registro de cliente. Se reutilizan `CustomerHeader` y los
valores visuales de `index.css`, con estilos propios en `features/auth` para evitar
que el formulario de registro dependa del CSS de checkout.

`registration.ts` contiene una validación pura: correo con formato básico tras
recortar espacios externos, contraseña obligatoria y confirmación exacta. Las
contraseñas no se recortan ni normalizan. No se ha inventado una longitud mínima ni
una política de complejidad: deberá definirse y validarse también en el backend.
El formulario usa `noValidate` para mostrar sus mensajes propios, con labels,
autocomplete, `aria-invalid`, descripción de errores y foco en el primer campo
inválido. Permite mostrar y ocultar ambas contraseñas.

«Validar registro (demostración)» solo comprueba esos campos; no envía solicitudes,
no crea cuentas ni inicia sesión. Tras validar se limpian las contraseñas y se
anuncia el resultado sin conservarlas en almacenamiento del navegador. Editar el
formulario limpia el resultado anterior. Salir o recargar descarta el borrador.
El carrito compartido se conserva al navegar por registro dentro de la SPA.
No hay espera artificial ni dependencias nuevas.

SWR-27 sigue parcial: unicidad del correo, creación del usuario y asignación del rol
por el servidor están pendientes. Hash bcrypt (SWR-28), autenticación y emisión de
JWT (SWR-29), y autorización de operaciones protegidas (SWR-30) no están implementados.
El formulario no cambia el acceso de las pantallas administrativas de demostración.

Prueba manual: desde catálogo abrir el icono de registro, enviar vacío y comprobar
el foco y los errores. Completar el correo, escribir contraseñas diferentes y volver
a validar. Corregirlas, probar «Mostrar contraseñas» y validar: aparece el aviso de
que no se creó una cuenta y ambas contraseñas quedan vacías. Volver al catálogo conserva las unidades del carrito.

## F-07: formulario de inicio de sesión

`/login` presenta correo y contraseña; se puede acceder desde «Ir al inicio de
sesión» en registro y volver mediante «Ir al registro». Comparte `AuthPage.css` con
registro para mantener la misma distribución centrada, colores y controles en los
tres tamaños. Este archivo sustituye a `RegistrationPage.css` porque ahora sirve
a dos pantallas de la misma funcionalidad.

`credentials.ts` contiene los tipos y la validación común de los campos. Registro
la reutiliza y añade la confirmación de contraseña. Inicio de sesión usa
`autocomplete="username"` para el correo y `current-password` para la contraseña;
registro conserva `email` y `new-password`. No se transforma la contraseña ni se
interpreta que un formato válido implique credenciales correctas.

«Validar acceso (demostración)» comprueba correo y contraseña obligatorios, muestra
errores asociados y enfoca el primer campo inválido. El control «Mostrar contraseña»
funciona con teclado. Al validar se limpia la contraseña y se vuelve a ocultar;
el aviso explica que no se verificaron credenciales ni se inició sesión. Editar
campos limpia el aviso. No hay llamadas a una API, espera artificial, tokens,
almacenamiento de credenciales ni acceso nuevo a operaciones administrativas.

La interfaz de SWR-29 sigue parcial: autenticación, rechazo de credenciales
incorrectas y JWT con vencimiento requieren integración con el backend. La
validación local no sustituye la autorización de SWR-30. Los formularios mantienen
sus borradores únicamente mientras están montados; navegar entre registro y acceso
o recargar los descarta, conservando el carrito al navegar dentro de la SPA.

Prueba manual: abrir `/register`, entrar en «Ir al inicio de sesión», validar vacío
y comprobar foco y errores. Escribir un correo de formato válido y una contraseña,
probar mostrarla y validar. Comprobar que el resultado no anuncia una sesión y que
la contraseña queda vacía. Navegar entre ambos formularios y volver al catálogo.

## F-08: bandeja de notificaciones de demostración

La campana del encabezado abre `/notifications`. Por defecto muestra los avisos
creados durante esta sesión de demostración. El selector permite revisar también
ejemplos independientes de pedidos registrados, pagados, cancelados y enviados. Cada aviso
incluye identificador del pedido, estado resultante y fecha y hora del cambio
(SWR-32, presentación con datos locales). La lista está ordenada del cambio más
reciente al más antiguo. Las fechas usan `time` con su valor ISO y se muestran en
`America/Bogota`, independientemente de la zona horaria del navegador.

`features/notifications/notificationsDemo.ts` separa los ejemplos del componente.
`NotificationsPage` reutiliza el encabezado y los valores visuales compartidos;
solo guarda el escenario visual de avisos de sesión, ejemplos o bandeja vacía. El selector anuncia el
resultado sin mover el foco. La ruta tiene título de documento, encabezado enfocable
y salto al contenido. No introduce dependencias ni almacenamiento persistente.

Los ejemplos visuales no pertenecen a una cuenta y permanecen separados de los
avisos generados al crear pedidos de demostración. Cambiar el resultado visual
del pago no genera notificaciones. No hay envío de correos, notificaciones del navegador,
registro de entrega. Solo los avisos de sesión con un pedido conservado ofrecen
un enlace a su detalle; los ejemplos visuales no lo ofrecen. El acceso a esta
ruta no modifica carrito, pedidos, reservas ni inventario.

F-08 sigue parcial: generar avisos desde cambios confirmados (SWR-31), entregarlos
al propietario y protegerlos mediante la API (SWR-33), evitar duplicados por evento
(SWR-34) y registrar los resultados e intentos fallidos (SWR-35) requieren backend.
La bandeja pública contiene únicamente ejemplos identificados como demostración.
No representa una bandeja privada protegida por autenticación.

Prueba manual: abrir catálogo y pulsar la campana. Revisar los cuatro avisos,
sus estados, identificadores y fechas mediante «Mostrar ejemplos». Elegir «Bandeja
vacía», comprobar el mensaje y volver a los avisos de sesión. Volver al catálogo
conserva las unidades del carrito; recargar elimina los avisos locales y deja la
bandeja de sesión vacía.


### Aviso local al crear un pedido de demostración

`CheckoutFlow` informa a `App` de una creación correcta mediante una función que
recibe la copia del pedido creado. `App` conserva en memoria esa copia y su aviso
en una misma actualización para que sobrevivan a la navegación fuera de checkout.
El aviso solo contiene referencia, estado y fecha, sin datos personales. La bandeja
solo recibe esa lista para presentarla; no necesita Context ni nuevas dependencias.

`recordRegisteredNotification` añade un aviso «Registrado» al principio de la lista.
Su clave combina evento y pedido: repetir la misma creación no duplica el aviso ni
cambia su fecha original. Es una deduplicación local, no una garantía de SWR-34
frente a concurrencia o reintentos del servidor. Fallar al crear, visualizar un pago
aprobado o cambiar de escenario no genera avisos ni modifica inventario.

Prueba: crear un pedido de demostración y abrir la campana. En «Avisos creados en
esta sesión» aparece un único aviso con la referencia y fecha del pedido. Navegar
al catálogo y volver lo conserva; «Bandeja vacía» solo oculta la lista. Recargar la
elimina. La generación desde cambios confirmados, destinatarios autenticados,
entrega y registro de intentos siguen pendientes del backend.


## Detalle de pedidos creados en la sesión de demostración

`/orders/:orderId` muestra una copia de solo lectura del pedido creado: referencia,
fecha en hora de Colombia, estado pendiente de pago, productos, tallas, cantidades,
precios, subtotal y datos de envío. Se accede desde «Ver detalle del pedido» en el
resumen o desde el aviso correspondiente en notificaciones. No consulta el catálogo
para reconstruir las líneas: editar o desactivar un producto no modifica el nombre
ni el precio de pedidos anteriores (SWR-14, comportamiento local).

`App` conserva pedidos y avisos en un único estado de sesión. El callback de
checkout copia cliente y líneas al recibir una creación correcta. Repetir la misma
referencia no sustituye su detalle ni añade otro aviso de registro. La página de
detalle recibe esa lista de pedidos y la referencia de la ruta; no crea pedidos ni
inicia pagos. No se han añadido Context, dependencias o endpoints.

Los datos de envío permanecen únicamente en memoria del proceso del frontend;
no se guardan en localStorage ni sessionStorage. Recargar elimina pedidos y avisos.
Una referencia desconocida o perdida tras recargar muestra «Pedido no disponible»
y enlaces para volver a notificaciones o catálogo. No es una consulta de pedidos
reales ni sustituye la autorización del backend para datos de clientes.

Prueba manual: crear un pedido desde el carrito, abrir su detalle desde el resumen,
volver a notificaciones y abrir el mismo pedido. Comprobar referencia, fecha,
productos y datos de envío. Recargar muestra el estado no disponible. Los ejemplos
fijos de notificaciones no enlazan a un detalle inexistente.


## Conservar datos y envío al editar el carrito

El borrador de `CheckoutData` se mantiene en memoria en `App`, por encima de las
rutas de carrito y checkout. `CheckoutFlow` lo recibe por props y comunica los
cambios mediante `onDataChange`. Así «Editar carrito» ya no borra nombre, correo,
teléfono o dirección al desmontar checkout. Al volver, se validan los datos y el
resumen usa las cantidades actuales del carrito.

Un error de creación conserva el borrador para corregir y reintentar. Crear el
pedido correctamente lo limpia para la próxima compra; el pedido histórico sigue
mostrando su propia copia de los datos de envío. Los errores de campo, los estados
de carga y los escenarios de demostración siguen siendo locales a sus pantallas.
No hay localStorage, sessionStorage, cookies ni envío de datos a una API. Recargar
descarta el borrador, incluso si estaba incompleto.

Prueba manual: agregar un producto, completar datos y envío y pasar al resumen.
Elegir «Editar carrito», guardar otra cantidad y continuar la compra. Comprobar que
los seis campos siguen completos y que el resumen refleja la cantidad nueva. Tras
crear el pedido y abrir su detalle, volver al carrito e iniciar otra compra: los
campos comienzan vacíos, mientras el detalle anterior conserva sus datos.

## Estado actualizado de los requisitos y acceso administrativo

Consultar [Estado de requisitos](docs/requirements-status.md) para la separación
entre frontend implementado, integración pendiente y elementos de mockups ajenos
a los 35 SWR del Excel. El encabezado ofrece «Administración (demo)» hacia productos;
la navegación administrativa existente permite acceder también a inventario.
Las pantallas administrativas siguen siendo de demostración, sin autorización real.

Se corrigió el enlace «Continuar con la compra» del carrito: clase propia, texto
blanco, fondo principal y hover con contraste. Ya no reutiliza una clase de
checkout que podía ser sobrescrita por el estilo de los enlaces del carrito.


## Inventario compartido con catálogo y checkout

`App` conserva un `InventorySession` con artículos, historial y reservas, inicializado
mediante `createDemoInventorySession`. La página administrativa comunica sus cambios
por props; navegar ya no reinicia los ajustes. `getDemoAvailability` recibe las
cantidades de sesión y las usa tanto para mostrar tallas como para validar agregar
y preparar checkout. La aplicación pasa siempre esa fuente; los valores iniciales
por defecto quedan para ejemplos y pruebas de las funciones puras.

Ejemplo verificable: en administración, cambiar el vestido M de 15 a 6 existentes
con un motivo. Como hay 3 reservados, catálogo debe mostrar 3 disponibles. Una
selección previa de 4 se bloquea al entrar en checkout hasta corregirla. Cambiar
existente a 3 deja disponible en cero y esa talla no permite nuevas adiciones.
Agregar al carrito no cambia ninguna cantidad. Recargar reinicia toda la demo.

Sobre esta fuente común se pueden asociar productos nuevos con sus tallas/SKU y
después registrar existencias explícitamente, como describe el siguiente apartado.
No se crea stock automático al registrar un producto o talla. La creación de pedidos
todavía no genera reservas del laboratorio ni procesa pagos o transacciones reales.


## Registrar tallas/SKU para productos nuevos

En `/admin/inventory`, «Registrar talla / SKU» permite elegir un producto activo,
un SKU único y una etiqueta de talla. La validación local rechaza campos vacíos,
productos desconocidos/inactivos, SKU duplicado y una talla repetida dentro del
mismo producto, ignorando mayúsculas y espacios exteriores. La etiqueta puede ser
alfabética o numérica; no se inventó una lista cerrada de tallas.

`createDemoVariant.ts` separa esa lógica del formulario accesible
`InventoryVariantForm`. El nuevo artículo guarda `productId`, el identificador
interno estable; `getDemoAvailability` usa esa asociación en lugar del mapa fijo
que solo conocía los productos iniciales. Cambiar el nombre o código comercial no
desvincula las tallas. El ejemplo de falda sin producto comercial sigue siendo una
fila del laboratorio, sin añadirlo artificialmente al catálogo.

Dar de alta la talla establece existente y reservado en cero. No constituye un
ajuste de existencias ni genera movimientos de stock. El ingreso de unidades se
hace mediante «Ajustar existencias», conservando el motivo y el historial existentes.
Con stock disponible, la talla se puede seleccionar en catálogo y pasa al carrito
y checkout con su SKU, cantidad y precio del producto. Sin stock, permanece agotada.

Prueba manual: registrar un producto nuevo, ir a Inventario y asociarle un SKU y
una talla. Verificar que aparece en cero y todavía no permite agregarlo al carrito.
Ajustar sus existencias a 5 con un motivo, volver a catálogo y agregar 2 unidades.
Revisar el subtotal en carrito y confirmar el pedido de demostración. Agregar y
crear el pedido no descuentan stock; la reserva automática sigue pendiente.
Todos los cambios se pierden al recargar y no existe autorización de servidor.


## F-08: consulta administrativa del procesamiento

Desde administración, «Notificaciones» abre `/admin/notifications`. Muestra ejemplos
fijos con identificador de aviso y pedido, estado del pedido notificado, fecha del
evento, resultado de procesamiento y cantidad de intentos. Se puede filtrar por
pendiente, procesado o fallido, y desplegar los intentos con sus fechas, resultados
y explicación. Un aviso lógico aparece una sola vez aunque tenga varios intentos.

`notificationProcessingDemo.ts` separa los historiales ilustrativos de
`NotificationProcessingPage`. La pantalla reutiliza `AdminHeader` y los estilos
de tarjetas y metadatos de la bandeja de notificaciones, con HTML nativo `details`
y `summary` para manejar el historial por teclado. No se introdujeron dependencias,
servicios ficticios, datos de destinatarios ni contratos de API.

Este bloque cubre la presentación de SWR-35; registrar los resultados reales y
consultarlos con permisos sigue pendiente del backend. «Procesado» no prueba que
un destinatario recibió el aviso. La pantalla no tiene acciones de envío o
reintento y no genera avisos de sesión. Los ejemplos permanecen separados de los
pedidos y notificaciones creados en el checkout de demostración.

Prueba manual: Administración → Notificaciones → filtrar «Fallido» y abrir los
intentos del aviso. Cambiar a «Procesado» y revisar el ejemplo con un fallo previo
y un segundo intento procesado; cambiar a «Pendiente» para ver el caso sin intentos.
Recargar restaura el filtro «Todos». No se modifica el estado de pedidos o inventario.
