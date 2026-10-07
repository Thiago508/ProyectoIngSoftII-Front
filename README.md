# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Checkout RF5: incremento de navegación

- `/checkout`: datos personales y dirección de envío.
- `/checkout/payment`: selección de método de pago de demostración.
- `/checkout/summary`: revisión y creación de un pedido de demostración pendiente de pago.

`CheckoutFlow` conserva datos y método de pago en estado React y renderiza un único
`CustomerHeader`. Las páginas reciben valores y callbacks por props; no se necesita
Context para este flujo pequeño. El borrador se conserva al cambiar de ruta, pero se
pierde al recargar. No se almacena información personal en localStorage.

Pago requiere datos válidos; Resumen requiere además un método seleccionado.
El acceso directo tras una recarga redirige a Datos y envío. La raíz y rutas
desconocidas redirigen al checkout mientras no exista una página de inicio.
Los métodos son opciones del mockup y no acreditan disponibilidad real de una pasarela.

### Verificación manual

1. Ejecutar `npm run dev` y abrir `/checkout`.
2. Enviar vacío: verificar errores y foco en Nombre completo.
3. Completar datos válidos y continuar: verificar `/checkout/payment`.
4. Intentar revisar sin método: verificar mensaje y foco en el primer radio.
5. Elegir un método, revisar y usar ambos enlaces de edición: comprobar que se
   conservan datos y método. Probar también Atrás y Adelante del navegador.
6. Recargar `/checkout/payment` o `/checkout/summary`: comprobar regreso al formulario.
7. Revisar teclado y anchos móvil, tablet y escritorio.

Checks: `npm run build`, `npm run lint`, `npm test` (validación de datos).
Las verificaciones manuales anteriores no son pruebas automatizadas de navegación.

### Pedido de demostración

`demo/demoCart.ts` contiene únicamente productos del mockup. `createDemoOrder.ts`
es una simulación asíncrona local, separada de la UI; no define endpoints ni un
contrato de backend. Devuelve una copia del borrador con referencia DEMO y estado
pendiente de pago. No modifica el carrito ni inventario. El subtotal es $219.700
COP; el costo de envío está pendiente de definir. La integración real deberá
validar precios, disponibilidad, concurrencia y aprobación del pago.

En Resumen, activar «Simular error de creación», crear y comprobar el mensaje.
Desactivar la opción y reintentar: comprobar referencia DEMO y estado pendiente
de pago. Durante la espera, el botón queda bloqueado. Tras crear, volver mediante
el historial a Datos o Pago redirige al resumen para no editar el pedido creado.
Al recargar se pierde también el pedido simulado; no existe persistencia real.

El mockup de pago aprobado solo podrá mostrarse con una aprobación verificada.
La creación local de este incremento no completa RF5 en producción.
