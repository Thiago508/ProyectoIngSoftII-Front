# Diagnóstico técnico y refactorización — Fashion Online Store

**Asignatura:** Ingeniería de Software II  
**Fecha de revisión:** 26 de octubre de 2026  
**Equipo / integrantes:** Santiago Trujillo - Karen Dahiana Martinez
**Repositorio:** https://github.com/Thiago508/ProyectoIngSoftII-Front
**Rama:** `main`  
**Commit de refactorización:** `e6f44f6`  
**Mensaje del commit:** `refactor(checkout): separate order preparation from simulation`

---

## 1. Contexto y alcance

El proyecto **Fashion Online Store** es una aplicación web desarrollada con React, TypeScript y Vite, orientada a la gestión de una tienda de ropa en línea.

Para el presente diagnóstico se seleccionó la funcionalidad **F-01 — Realizar pedido**, correspondiente al proceso de checkout. Esta funcionalidad involucra los datos del comprador, el carrito de compras, los productos, la disponibilidad de inventario y la creación de un pedido simulado.

Se consideran los requisitos relacionados **SWR-01 a SWR-05**, sujetos a la correspondencia definitiva con la matriz de requisitos del equipo.

El objetivo de la actividad consiste en identificar oportunidades de mejora técnica, evaluar responsabilidades y dependencias entre módulos, seleccionar un hallazgo para refactorizar y comprobar que el comportamiento observable se conserva.

**Alcance:** se auditaron los módulos relevantes del frontend y su flujo de creación de pedidos. La operación examinada es una simulación local; no se verificó una transacción persistente de backend.

## 2. Arquitectura observada

### 2.1 Clasificación arquitectónica

La aplicación presenta una arquitectura **frontend SPA (Single Page Application)**, desarrollada con React, TypeScript, Vite y React Router.

Su estructura sigue una organización **modular por funcionalidades (*feature-based*)**. El código se agrupa principalmente dentro de `src/features/`, donde cada módulo representa una capacidad funcional de la tienda.

Entre las funcionalidades observadas se encuentran:

- `checkout`: proceso de compra y creación del pedido.
- `cart`: operaciones del carrito.
- `catalog`: consulta del catálogo.
- `products`: gestión y consulta de productos.
- `inventory`: operaciones de inventario.
- `auth`: autenticación y registro.
- `orders`: información de pedidos.
- `notifications`: notificaciones.

La carpeta `src/shared/components/` contiene componentes visuales compartidos.

### 2.2 Organización y responsabilidades

| Archivo o módulo | Responsabilidad observada |
|---|---|
| `src/main.tsx` | Punto de entrada de la aplicación React. |
| `src/App.tsx` | Composición de rutas y coordinación del estado compartido de la sesión. |
| `src/features/checkout/CheckoutFlow.tsx` | Coordinación del flujo de compra, navegación, creación del pedido y tratamiento de errores. |
| `src/features/checkout/pages/` | Presentación de formularios, resumen, selección de pago y resultado. |
| `src/features/cart/cart.ts` | Operaciones sobre los artículos del carrito. |
| `src/features/cart/checkoutCart.ts` | Preparación de las líneas del carrito para el checkout, considerando catálogo e inventario. |
| `src/features/checkout/utils/checkoutValidation.ts` | Validación y normalización de datos del comprador. |
| `src/features/checkout/utils/checkoutNavigation.ts` | Reglas de navegación del checkout. |
| `src/features/checkout/demo/createDemoOrder.ts` | Simulación asíncrona de creación de pedidos. |
| `src/features/checkout/domain/calculateSubtotal.ts` | Cálculo del subtotal, extraído durante H-02. |
| `src/features/checkout/domain/prepareOrder.ts` | Validación y preparación de una instantánea del pedido, extraída durante H-02. |
| `src/features/checkout/types/checkout.types.ts` | Tipos compartidos del proceso de compra. |

### 2.3 Gestión de estado

`App.tsx` concentra diferentes estados de sesión mediante React, entre ellos productos, inventario, carrito, borrador de compra y pedidos.

Estos datos se transmiten a otros componentes mediante propiedades y funciones de actualización.

La centralización permite coordinar el comportamiento actual, pero también constituye un punto de atención arquitectónica: a medida que aumenten las funcionalidades, `App.tsx` podría adquirir demasiadas responsabilidades.

Esta observación no demuestra automáticamente una violación de SOLID.

### 2.4 Flujo de F-01 — Realizar pedido

1. `App.tsx` mantiene los datos del carrito, productos, inventario y comprador.
2. `CheckoutFlow.tsx` coordina las etapas del proceso de compra.
3. `prepareCheckoutCart()` prepara las líneas del pedido utilizando los datos disponibles de catálogo e inventario.
4. Las funciones de `checkoutValidation.ts` validan y normalizan los datos del comprador.
5. El usuario revisa el resumen del pedido y confirma la operación.
6. `CheckoutFlow.tsx` invoca `createDemoOrder()`.
7. Después de H-02, `createDemoOrder()` delega la preparación de los datos en `prepareOrder()`, que utiliza `calculateSubtotal()`.
8. `createDemoOrder()` conserva la espera artificial, los errores simulados y la generación de identificador, fecha y estado del pedido.
9. Cuando la operación termina correctamente, el resultado se comunica a `App.tsx` para actualizar el estado de la sesión y continuar el flujo.

### 2.5 Dependencias identificadas

El flujo principal de llamadas observado es:

```text
App.tsx
   |
   v
CheckoutFlow.tsx
   |
   +--> prepareCheckoutCart()
   |
   +--> createDemoOrder()
              |
              v
         prepareOrder()
              |
              +--> validateCheckoutData()
              +--> normalizeCheckoutData()
              +--> calculateSubtotal()
```

Esta representación muestra dependencias relevantes del proceso auditado, no todas las dependencias del proyecto.

### 2.6 Persistencia y límites

En el flujo revisado, la creación de pedidos se simula y los resultados se conservan en estado de sesión del frontend.

No se identificó una operación HTTP persistente ni una transacción de base de datos asociada a `createDemoOrder()`.

Por lo tanto, las comprobaciones locales de disponibilidad no deben interpretarse como garantías transaccionales de inventario.

La ausencia de backend no se considera automáticamente un defecto, dado que el alcance actual incluye funcionalidades de demostración.

### 2.7 Evaluación arquitectónica

**Fortalezas observadas:**

- Agrupación modular por funcionalidades.
- Separación entre páginas, componentes, tipos y utilidades.
- Existencia de pruebas automatizadas para operaciones relevantes.
- Uso de TypeScript para definir contratos de datos.
- Extracción de reglas reutilizables durante H-02.

**Aspectos susceptibles de mejora:**

- Concentración de estado y coordinación funcional en `App.tsx`.
- Acoplamiento del flujo de compra a una implementación de demostración.
- Necesidad futura de definir límites entre frontend y servicios persistentes.
- Conveniencia de mantener reglas reutilizables independientes de detalles de simulación.

## 3. Hallazgos técnicos

### H-01 — Acoplamiento entre coordinación visual y creación simulada

**Clasificación:** riesgo arquitectónico.

**Ubicación:** `src/features/checkout/CheckoutFlow.tsx`, especialmente la función `handleCreate()`.

**Evidencia:** el componente invoca directamente `createDemoOrder()`, gestiona estados de envío, interpreta errores como `DemoAvailabilityError`, actualiza el pedido y coordina la navegación.

**Análisis:** estas actividades están relacionadas con la coordinación del flujo, pero también generan dependencia directa de una implementación de demostración.

No se considera una violación demostrada del principio de responsabilidad única, porque gestionar estados y navegación puede ser una responsabilidad legítima de un componente coordinador.

**Riesgo:** una integración futura con un backend podría requerir modificaciones adicionales en el componente.

**Mejora propuesta:** evaluar la extracción de una operación de aplicación o un hook especializado cuando exista una integración real que justifique esa abstracción.

**Estado:** identificado, no intervenido.

### H-02 — Mezcla de reglas de preparación y mecanismos de simulación

**Clasificación:** deuda técnica preventiva y oportunidad de mejora.

**Ubicación original:** `src/features/checkout/demo/createDemoOrder.ts`.

**Evidencia:** el archivo contenía operaciones de validación, normalización, cálculo del subtotal, preparación de una copia del pedido, espera artificial, errores simulados y generación de identificador y fecha.

**Análisis:** las reglas de preparación del pedido y los mecanismos de simulación responden a motivos de cambio diferentes.

Por ejemplo, modificar el cálculo monetario no debería requerir intervenir un módulo responsable de simular latencia o fallos.

Esta combinación representaba una oportunidad concreta para mejorar cohesión y reducir acoplamiento, sin necesidad de afirmar que el archivo original violaba formalmente SOLID.

**Mejora propuesta:** extraer el cálculo del subtotal y la preparación del pedido a funciones independientes dentro de `checkout/domain/`.

**Estado:** intervenido y verificado.

### H-03 — Riesgo potencial de consistencia de inventario

**Clasificación:** riesgo arquitectónico futuro.

**Ubicación:** `src/features/cart/checkoutCart.ts` y flujo de confirmación de `CheckoutFlow.tsx`.

**Evidencia:** el checkout utiliza información local de catálogo e inventario para preparar el pedido. La creación del pedido continúa mediante una operación simulada.

**Análisis:** una validación local no sustituye la comprobación definitiva de disponibilidad en una transacción persistente.

En un escenario real, dos compradores podrían consultar una misma unidad disponible antes de confirmar sus pedidos.

**Riesgo:** si una implementación futura confiara exclusivamente en el estado del frontend, podrían producirse decisiones basadas en información desactualizada.

**Mejora propuesta:** realizar comprobaciones y reservas transaccionales de inventario desde un servicio de backend.

**Estado:** riesgo futuro documentado, no defecto funcional demostrado en la implementación actual.

## 4. Priorización de hallazgos

Se utiliza una escala de 1 a 3:

- **1:** bajo.
- **2:** medio.
- **3:** alto.

| Hallazgo | Impacto | Riesgo | Esfuerzo | Decisión |
|---|---:|---:|---:|---|
| H-01 | 3 | 2 | 2 | Posponer hasta evaluar integración real. |
| H-02 | 2 | 2 | 1 | Seleccionado para refactorización. |
| H-03 | 3 | 3 | 3 | Documentar para una futura etapa de backend. |

**Justificación de la selección:** H-02 ofrecía una mejora localizada, con bajo esfuerzo de implementación y posibilidad de verificar la conservación del comportamiento mediante pruebas existentes y nuevas.

Los valores representan una valoración técnica propuesta por el análisis, no métricas objetivas de producción.

## 5. Intervención realizada

### 5.1 Situación anterior

`createDemoOrder.ts` agrupaba reglas reutilizables de preparación del pedido junto con mecanismos propios de la simulación.

Adicionalmente, `CheckoutSummaryPage.tsx` importaba `calculateSubtotal()` desde el módulo de demostración, aunque únicamente necesitaba realizar un cálculo monetario.

### 5.2 Objetivo

Separar las reglas reutilizables del pedido de los detalles de simulación, conservando el contrato público y los comportamientos existentes.

### 5.3 Archivos intervenidos

| Archivo | Modificación |
|---|---|
| `domain/calculateSubtotal.ts` | Se extrajo el cálculo y la validación del subtotal. |
| `domain/prepareOrder.ts` | Se creó una función para validar y preparar una copia del pedido. |
| `domain/prepareOrder.test.ts` | Se incorporaron tres pruebas unitarias. |
| `demo/createDemoOrder.ts` | Se delegó la preparación del pedido a `prepareOrder()`. |
| `demo/createDemoOrder.test.ts` | Se ampliaron las pruebas de caracterización. |
| `pages/CheckoutSummaryPage.tsx` | Se modificó la importación de `calculateSubtotal()` para depender del módulo de dominio. |
| `package.json` | Se incluyeron las nuevas pruebas en `npm run test`. |

### 5.4 Comparación de responsabilidades

**Antes:**

```text
createDemoOrder.ts
  ├── Validación de datos
  ├── Normalización
  ├── Cálculo del subtotal
  ├── Preparación del snapshot
  ├── Latencia simulada
  ├── Errores simulados
  └── Creación del pedido de demostración
```

**Después:**

```text
domain/
  ├── calculateSubtotal.ts
  └── prepareOrder.ts

demo/
  └── createDemoOrder.ts
       ├── Utiliza prepareOrder()
       ├── Simula latencia y errores
       └── Genera el pedido de demostración
```

### 5.5 Fragmento representativo

La creación simulada delega la preparación del pedido:

```ts
const { subtotal, ...snapshot } = prepareOrder(customer, items);
```

La función `prepareOrder()` concentra la preparación de datos:

```ts
export function prepareOrder(
  customer: CheckoutData,
  items: readonly CheckoutItem[]
) {
  if (Object.keys(validateCheckoutData(customer)).length) {
    throw new Error("Revisa los datos de compra.");
  }

  const subtotal = calculateSubtotal(items);

  const snapshot = {
    customer: normalizeCheckoutData(customer),
    items: items.map((item) => ({ ...item }))
  };

  return { ...snapshot, subtotal };
}
```

### 5.6 Justificación técnica

La intervención mejora la cohesión al mantener las reglas de preparación en un módulo independiente de los mecanismos de demostración.

También reduce el acoplamiento: la página de resumen puede calcular subtotales sin importar una función desde el módulo que simula la creación del pedido.

No se introdujeron repositorios, servicios HTTP ni interfaces adicionales porque el alcance actual no demuestra su necesidad.

La copia de los artículos es superficial, lo cual es coherente con los campos planos observados. Si el modelo incorpora objetos anidados mutables, esta decisión deberá revisarse.

## 6. Verificación de la refactorización

### 6.1 Estrategia

Se utilizaron pruebas automatizadas existentes, pruebas de caracterización y nuevas pruebas de las funciones extraídas.

También se verificó la compilación de TypeScript, la construcción de producción y el análisis estático.

### 6.2 Pruebas automatizadas

**Comando:**

```bash
npm run test
```

**Resultado final:**

| Indicador | Valor |
|---|---:|
| Pruebas ejecutadas | 68 |
| Aprobadas | 68 |
| Fallidas | 0 |
| Canceladas | 0 |
| Omitidas | 0 |
| Duración | 4781,47 ms |

Las pruebas nuevas de `prepareOrder.test.ts` verifican:

1. Preparación de un snapshot independiente y normalización de los datos.
2. Rechazo de datos inválidos del comprador antes de validar el carrito.
3. Cálculo del subtotal sin depender de la simulación.

Las pruebas existentes y de caracterización también cubren escenarios como carrito vacío, disponibilidad simulada, redondeo monetario, errores, reintentos, generación de identificador y fecha, y conservación de los datos originales.

### 6.3 Comparación antes y después

Durante la intervención se registró una ejecución satisfactoria de **65 pruebas** cuando el script todavía no incorporaba las tres pruebas nuevas del módulo de dominio.

Posteriormente, al incluirlas en `package.json`, el conjunto completo pasó a **68 pruebas aprobadas**.

Esta comparación refleja una ampliación del conjunto de pruebas, no una medición de rendimiento.

### 6.4 Compilación

**Comando:**

```bash
npm run build
```

**Resultado:**

- Compilación TypeScript completada.
- Vite 8.3.3.
- 85 módulos transformados.
- Construcción de producción exitosa.
- Duración reportada por Vite: 711 ms.

### 6.5 Análisis estático

**Comando:**

```bash
npm run lint
```

**Resultado:**

- Herramienta: Oxlint.
- 87 archivos analizados.
- 116 reglas.
- 0 advertencias.
- 0 errores.
- Duración: 114 ms.

### 6.6 Validación de Git

**Comandos:**

```bash
git diff --check
git status --short
git rev-parse --short HEAD
```

**Resultados:**

- `git diff --check`: sin errores.
- `git status --short`: sin cambios pendientes.
- `git rev-parse --short HEAD`: `e6f44f6`.

La captura del historial de GitHub confirma que el commit de refactorización se encuentra publicado en la rama `main`.

### 6.7 Limitaciones

Las verificaciones permiten concluir que el comportamiento cubierto por las pruebas se conserva después de la intervención.

Sin embargo, no se aportaron resultados de pruebas E2E, cobertura de código, pruebas de concurrencia real ni pruebas de integración con un backend persistente.

Por tanto, no se afirma que todos los posibles escenarios estén cubiertos.

## 7. Conclusiones y lecciones aprendidas

La refactorización de H-02 permitió separar las reglas de preparación del pedido de los mecanismos utilizados para simular su creación.

La nueva organización facilita la reutilización y prueba independiente del cálculo del subtotal y la preparación de los datos.

Se conservó el contrato de `createDemoOrder()` y los escenarios automatizados verificados.

El ejercicio también permitió reconocer que **no toda concentración de responsabilidades representa automáticamente una violación de SOLID**. Los hallazgos deben sustentarse en código, riesgos verificables y motivos de cambio identificables.

H-01 y H-03 permanecen documentados como asuntos para evaluar en futuras etapas, sin afirmar que se corrigieron.

Como práctica preventiva, se recomienda conservar pruebas de caracterización antes de futuras refactorizaciones y ejecutar pruebas, compilación y análisis estático durante las revisiones de código.

## 8. Trazabilidad Git

### 8.1 Commit de refactorización

| Campo | Valor |
|---|---|
| Rama | `main` |
| Hash corto | `e6f44f6` |
| Fecha | 26 de octubre de 2026 |
| Mensaje | `refactor(checkout): separate order preparation from simulation` |
| Estado | Registrado y visible en GitHub |

### 8.2 Diagnóstico técnico

Los hallazgos H-01, H-02 y H-03 se documentan en este archivo.

No se aportó evidencia de un commit inicial independiente de diagnóstico. Por transparencia, no se asigna un hash inexistente.

### 8.3 Verificación

Las verificaciones finales reportadas fueron:

- `npm run test`: 68 pruebas aprobadas.
- `npm run build`: satisfactorio.
- `npm run lint`: sin errores ni advertencias.
- `git diff --check`: sin errores.
- `git status --short`: árbol de trabajo limpio.

### 8.4 Commit documental

**Estado:** pendiente de creación al incorporar este archivo al repositorio.

**Mensaje recomendado:**

```bash
docs: record refactoring diagnosis and verification
```

El hash del commit documental deberá conservarse como evidencia de entrega una vez creado y publicado.

### 8.5 Secuencia real de trabajo

La refactorización fue implementada, verificada y publicada antes de registrar el presente diagnóstico en Markdown.

Por lo tanto, la secuencia real no reproduce exactamente el orden sugerido de diagnóstico, refactorización y verificación documental.

Se deja constancia de esta diferencia para mantener la trazabilidad histórica sin reescribir artificialmente los commits.

---

## Conclusión general

La intervención H-02 cumplió el objetivo de mejorar la separación de responsabilidades dentro de la funcionalidad F-01 — Realizar pedido.

La preparación del pedido quedó desacoplada de los detalles de simulación, y las verificaciones realizadas respaldan la conservación del comportamiento cubierto por las pruebas automatizadas.

Los hallazgos no intervenidos permanecen registrados para una evaluación posterior, de acuerdo con la evolución arquitectónica del proyecto.
