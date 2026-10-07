# Fashion Online Store

Proyecto académico de tienda de ropa femenina con React, TypeScript y Vite.
El incremento actual desarrolla el frontend de **RF5: Realizar pedidos** mediante
un carrito y una operación de creación explícitamente simulados. No completa RF5
en producción: el documento académico exige pago obligatorio y todavía no existe
una integración de backend o pagos.

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
| `/checkout/payment` | Selección de método de pago de demostración | Datos válidos |
| `/checkout/summary` | Productos, datos, método y creación simulada | Datos válidos y método seleccionado |

El stepper usa **Datos y envío → Pago → Resumen**. Se unieron Datos y Envío porque
el mockup los presenta en el mismo formulario y no define otra pantalla de envío.
La raíz y rutas desconocidas redirigen al checkout hasta que exista un inicio real.

Volver entre etapas conserva lo escrito y el método elegido. Recargar elimina el
borrador y el pedido simulado: todo vive en memoria, sin localStorage ni envío de
datos personales a una API. El acceso directo sin requisitos vuelve a la etapa
correspondiente.

Durante la creación, el botón bloquea envíos repetidos y la navegación a etapas
anteriores vuelve al resumen. Tras un error se puede reintentar o editar. Después
de crear, el historial vuelve al pedido creado para evitar modificarlo.

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
descuenta solo después de una aprobación verificada por el backend. No se
implementaron reservas ni vencimientos. Un clic, una redirección y el estado local
no constituyen evidencia de pago aprobado.

Las opciones de pago proceden del mockup, incluida contra entrega; no acreditan
su disponibilidad real. Su relación con el requisito de pago obligatorio debe
confirmarse antes de integrar el flujo definitivo. No se recogen números de
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
desbordamiento horizontal. Son quince ejecuciones: cinco casos en escritorio,
cinco en tablet y cinco en móvil emulado. No equivale a Safari ni a un iPhone físico.

El caso de teclado guarda `datos.png` y `resumen.png` por proyecto en
`test-results/`, junto a las trazas de fallos. Los artefactos se excluyen de Git.

Para una demostración manual:

1. Enviar el formulario vacío y corregir sus errores.
2. Completar datos, continuar, elegir método y volver: comprobar conservación.
3. Revisar productos y subtotal; simular un fallo y reintentar.
4. Durante la creación pulsar Atrás: debe permanecer en Resumen.
5. Comprobar referencia DEMO y estado pendiente de pago; recargar para demostrar
   que no existe persistencia.
6. Recorrer con Tab, Shift+Tab y flechas; comprobar los anuncios con lector de
   pantalla. Esta última revisión sigue siendo manual.

## Trabajo pendiente fuera de la demostración

- Acordar el contrato real de creación y consulta del pedido con backend.
- Recibir el carrito real de RF4 y validar en backend precios y disponibilidad.
- Definir costo de envío y política de los métodos de pago.
- Integrar RF6 y confirmar pagos desde una fuente verificada; después actualizar
  inventario con control de concurrencia en backend.
- Definir persistencia y autorización con el equipo antes de guardar datos.

Catálogo, autenticación, administración y seguimiento no forman parte de este
incremento. No se inventaron endpoints ni se publicaron cambios en Jira o hosting.

La revisión visual y accesible, sus correcciones y la prueba auditiva pendiente están
en [docs/checkout-review.md](docs/checkout-review.md). La suite de revisión añade
18 análisis axe y capturas de Pago, errores y resultado en los tres tamaños.
