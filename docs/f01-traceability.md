# F-01: Realizar pedido — trazabilidad frontend

Referencia: `PR - TiendaRopa.xlsx`, hoja «Priorización de Requerimientos»,
filas 4–8. Revisión del 19 de octubre de 2026. El Excel es la fuente de requisitos;
este documento describe evidencias locales, sin declarar validación del cliente.

## Requisitos y evidencia

| Requisito | Comportamiento frontend | Archivos y pruebas | Límite actual |
| --- | --- | --- | --- |
| SWR-01: rechazar carrito vacío | Mensaje específico, subtotal cero y confirmación bloqueada; la simulación también rechaza el intento | `CheckoutSummaryPage.tsx`, `createDemoOrder.ts`; caso SWR-01 en `createDemoOrder.test.ts` y escenario vacío en `checkout-review.spec.ts` | Backend deberá rechazarlo independientemente de la UI |
| SWR-02: comprobar disponibilidad al confirmar | Maneja un rechazo simulado, identifica producto y talla y permite recuperar el flujo sin crear pedido | `DemoAvailabilityError`, `CheckoutFlow.tsx`; caso SWR-02 y escenario de disponibilidad en navegador | No se consulta stock ni se garantiza concurrencia; backend debe comprobar y reservar transaccionalmente |
| SWR-03: presentar datos para confirmar | Datos personales, dirección, productos, tallas, cantidades, precio unitario y subtotal antes del botón de creación | `CheckoutDataPage.tsx`, `CheckoutSummaryPage.tsx`; validaciones y edición del borrador en las pruebas | Envío y total definitivo pendientes de reglas del equipo |
| SWR-04: registrar pedido y líneas tras confirmar | Operación simulada solo al confirmar, con espera, error, reintento y protección contra clics duplicados; copia del pedido separada del borrador | `CheckoutFlow.tsx`, `createDemoOrder.ts`; pruebas de copia y de historial durante la creación | No hay registro en servidor, reserva real ni idempotencia de backend |
| SWR-05: entregar identificador y confirmación | Tras éxito muestra referencia DEMO, fecha, estado pendiente y detalle; enfoca el título | `CheckoutSummaryPage.tsx`; pruebas de resultado y selección posterior de pago | Identificador y fecha simulados, sin persistencia ni notificación externa |

Las rutas relativas de componentes, modelo y simulación están bajo
`src/features/checkout/`; las pruebas de navegador están en `tests/`.

## Dependencias entre funcionalidades

- **F-05 / SWR-19–22:** entrega el carrito real. La demo no permite gestionar artículos
  ni reserva por agregar productos. El subtotal suma precio unitario por cantidad.
- **F-02 / SWR-08–10:** reserva al registrar, libera al cancelar o expirar y convierte
  la reserva en salida solo con pago confirmado. No se implementan reservas en UI.
- **F-03 / SWR-14:** cada línea conserva nombre y precio aplicados. La copia local
  tiene una prueba; el almacenamiento histórico real corresponde al backend.
- **F-06 / SWR-23–26:** pago posterior de un pedido pendiente con reserva vigente e
  importe del servidor. La selección actual guarda una preferencia local, sin
  iniciar pago ni demostrar vigencia de reserva.
- **F-08 / SWR-31–35:** notificaciones por eventos confirmados. La constancia visual
  de F-01 no equivale a enviar una notificación, correo o mensaje externo.

## Información por acordar con backend

Esta lista es una agenda de coordinación; no define rutas, nombres de campos,
códigos HTTP ni un contrato REST inventado.

| Tema | Información que necesita el frontend |
| --- | --- |
| Creación | Cómo identificar carrito/artículos y variantes; datos de compra requeridos; autenticación aplicable |
| Resultado | Identificador, fecha, estado, líneas registradas y desglose monetario con moneda |
| Rechazo | Cómo distinguir carrito vacío, disponibilidad insuficiente y datos inválidos; identificación de artículos/campos afectados |
| Precio o stock cambiado | Resultado esperado y si el cliente debe revisar y confirmar nuevamente |
| Respuesta incierta | Cómo consultar si la creación ocurrió después de una desconexión, evitando duplicarla |
| Reserva | Estado y, si existe, vencimiento devuelto por servidor; no se deduce una duración en frontend |
| Pago | Qué resultado confirma que el pedido puede pasar a F-06; fuente del importe y de la reserva vigente |

## Criterio de entrega y pendientes

Puede presentarse como **frontend de F-01 con integración simulada**. Los estados
están implementados y cubiertos por pruebas locales. No debe declararse que F-01
está integrado o registrado en producción hasta conectar y probar con backend.

Pendientes: integración con carrito y backend, costo de envío/importe definitivo,
comprobación de reservas desde servidor y escucha manual con lector de pantalla.
La revisión automática de accesibilidad no sustituye esa escucha ni certifica
conformidad completa. La pantalla de selección de pago es una demostración aparte.

## Guion de demostración

1. Completar datos y llegar a Resumen sin seleccionar método de pago.
2. Verificar productos, tallas, cantidades, precios unitarios y subtotal.
3. Seleccionar carrito vacío: confirmar bloqueo; restaurar carrito válido.
4. Seleccionar disponibilidad insuficiente y confirmar: comprobar artículo afectado
   y ausencia de referencia DEMO.
5. Restaurar escenario válido y crear: comprobar referencia, fecha y pendiente de pago.
6. Seleccionar método después de crear: el pedido conserva referencia y estado.
7. Recargar: se elimina el estado local; explicar que aún no existe persistencia.
