# Revisión del checkout — 7 de octubre de 2026

## Alcance y método

Se revisaron el frontend de demostración y sus estados: datos con errores, Pago,
Pago sin selección, resumen, fallo de creación y pedido creado pendiente de pago.
Chromium se ejecutó en escritorio (1280 × 720), tablet (768 × 1024) y móvil emulado
(390 × 664 CSS px, perfil iPhone 13). No se utilizaron dispositivos físicos ni Safari.

Las pruebas guardan capturas, el árbol accesible del contenido principal y resultados
axe para los seis estados por tamaño. Se inspeccionaron visualmente las capturas de
Pago con error, fallo de creación y resultado en los tres tamaños.

## Hallazgos y correcciones

| Hallazgo | Cambio | Verificación |
| --- | --- | --- |
| Contraste insuficiente en botón principal y etiqueta activa | Rosa más oscuro `#b52d59` | axe sin infracciones detectadas en los estados auditados |
| Etiquetas futuras del stepper demasiado claras | Gris `#666666` | Revisión de contraste de axe |
| Error de selección asociado solo al grupo | `aria-describedby` también en cada radio | Descripción accesible comprobada al enfocar el primer radio |

La interfaz conserva la paleta rosa, los grupos del formulario y las opciones de
pago del mockup. El stepper tiene tres etapas según la decisión acordada. No se
replica la captura de pago aprobado: el resultado actual es un pedido simulado
pendiente de pago. Tampoco se recogen datos bancarios sin una integración real.

## Resultado visual

Pago, su error, el fallo de creación y el resultado permanecen legibles en los
anchos revisados. No se observaron solapamientos en esas capturas. Las comprobaciones
de ancho no detectaron desbordamiento horizontal en los seis estados. La referencia
DEMO larga se divide en líneas en móvil. Los mensajes de error incluyen texto,
además del color. No se pretende una reproducción idéntica de los mockups.

## Resultado de accesibilidad automatizada

`tests/checkout-review.spec.ts` ejecuta axe con etiquetas WCAG 2.0 y 2.1 A/AA y
comprueba descripciones accesibles, radios con flechas, Tab hacia el botón, Enter
para continuar, foco tras errores y foco en el título del resultado. También verifica
el contenido de la región `status` durante la creación y después del éxito.

Los seis estados en los tres tamaños pasan las reglas ejecutadas: 18 análisis axe
sin infracciones detectadas. Esto no certifica conformidad completa ni confirma
la lectura hablada. El árbol accesible permite inspeccionar nombres y roles;
las comprobaciones de texto en regiones vivas no prueban cuándo un lector los anuncia.

## Prueba pendiente con lector de pantalla

Orca está instalado en el entorno. No se realizó una escucha de sus anuncios desde
esta sesión; el resultado de esa prueba permanece pendiente.

En una sesión local con Orca activo y el navegador abierto en `/checkout`:

1. Recorrer con Tab y Shift+Tab y activar «Saltar al contenido del checkout».
   Comprobar el foco y la lectura del título y los labels de cada campo.
2. Enviar los datos vacíos. Comprobar que se enfoca Nombre completo y se escucha
   su mensaje; recorrer los demás campos y comprobar cada descripción de error.
3. Completar datos válidos y continuar. Comprobar el título Pago y el grupo Método
   de pago. Enviar sin selección: verificar que se escucha el error en el radio.
4. Seleccionar con flechas y continuar con Tab y Enter. Comprobar título de Resumen,
   nombres de productos, tallas, cantidades, subtotal y advertencia de envío.
5. Activar el fallo simulado y crear. Escuchar el aviso de progreso y el error,
   comprobar que no se pierde el foco útil y que puede reintentarse.
6. Desactivar el fallo y reintentar. Escuchar el título del pedido creado y el estado
   pendiente de pago. Comprobar que no se anuncia un pago aprobado.

Registrar navegador, versión de Orca, anuncios escuchados y cualquier repetición
u omisión. Corregir los hallazgos antes de declarar terminada la revisión auditiva.

## Reproducir y consultar evidencias

```sh
PLAYWRIGHT_BROWSERS_PATH=/tmp/fashion-playwright npm run test:e2e
```

En otro entorno, instalar Chromium con `npx playwright install chromium` y ejecutar
`npm run test:e2e` sin la variable de esta sesión. Los PNG quedan en los directorios
`test-results/checkout-review-…-desktop`, `…-tablet` y `…-mobile`. Los árboles y los
resultados axe se adjuntan a los resultados de Playwright. `test-results/` se regenera
en cada ejecución y se excluye de Git; no es un archivo permanente de evidencias.
