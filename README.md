# Fashion Online Store

Proyecto académico de tienda de ropa femenina con React, TypeScript y Vite.
El incremento actual desarrolla el frontend de **F-01: Realizar pedido** (antes RF5) mediante
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
La raíz y rutas desconocidas redirigen al checkout hasta que exista un inicio real.

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
desbordamiento horizontal. Son veintiuna ejecuciones: siete casos en escritorio,
siete en tablet y siete en móvil emulado. No equivale a Safari ni a un iPhone físico.

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

Catálogo, autenticación, administración y seguimiento no forman parte de este
incremento. No se inventaron endpoints ni se publicaron cambios en Jira o hosting.

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
