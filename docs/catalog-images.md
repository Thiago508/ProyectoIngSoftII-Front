# Fotos del catálogo — 20 de octubre de 2026

## Assets de demostración

Se usó la herramienta integrada `image_gen` (sin CLI ni clave API del usuario).
Las imágenes son ilustrativas generadas con IA, no fotografías de mercancía real.
La interfaz las identifica mediante un pie de foto. No se reutilizó la imagen de una
prenda para representar otra ni se extrajeron fotos pequeñas de las capturas.

- `public/images/products/vestido-midi-demo.png`: vestido midi verde con flores crema.
- `public/images/products/blusa-manga-larga-demo.png`: blusa marfil de manga larga.

Son archivos PNG copiados al proyecto; las referencias del catálogo no dependen de
la carpeta de generación ni de enlaces externos. Se muestran con proporción 3:4 y
`object-fit: contain` para conservar la prenda completa. Los originales generados
no se sobrescribieron. El listado utiliza carga diferida y el detalle carga su foto
inmediatamente. El espacio reservado evita saltos de diseño durante la carga.

## Fotos reales del usuario

En `/admin/products`, editar o registrar permite seleccionar JPG, PNG o WebP de hasta
5 MB. Es un límite técnico de la demostración en memoria, no una regla comercial.
`readProductPhoto.ts` lee y decodifica el archivo antes de usarlo; un archivo con MIME
de imagen pero contenido ilegible muestra un error. Durante esa lectura asíncrona,
se bloquea guardar y se ignoran resultados de selecciones anteriores o desmontadas.

Se puede corregir el texto alternativo o quitar la foto. Si hay foto, la descripción
no puede quedar vacía. Guardar conserva la imagen en el estado de productos de App;
cancelar no modifica el registro. Editar sin cambiar la foto la mantiene. Los datos
locales se pierden al recargar y no se suben a ningún servidor ni se guardan en
localStorage. La futura subida y persistencia se acordarán con backend.

`ProductPhoto` se reutiliza en administración, catálogo y detalle. Presenta un estado
«Sin foto disponible» cuando falta la imagen o falla su carga. No sustituye una foto
fallida por la de otro producto.

## Prompts finales usados

### Vestido

```text
Use case: product-mockup. Asset type: single catalog photograph for an academic women's clothing shop demo. A single green and cream floral midi dress with narrow shoulder straps and flowing skirt, on an invisible mannequin, front view, whole garment visible. Photorealistic studio product photography, warm off-white background, soft even lighting, subtle natural shadow, realistic textile detail. Centered portrait composition with generous space around hem and straps, no cropping, no person, no accessories, no logos, no text or watermark. This is an illustrative demo product, not a real commercial item.
```

### Blusa

```text
Use case: product-mockup. Asset type: single catalog photograph for an academic women's clothing shop demo. A single ivory long-sleeved feminine blouse, elegant simple V neckline, softly draped fabric, button front, on an invisible mannequin, front view, whole garment visible. Photorealistic studio product photography, warm off-white background, soft even lighting, subtle natural shadow, realistic textile detail. Centered portrait composition with space around sleeves and hem, no cropping, no person, no accessories, no logos, no text or watermark. This is an illustrative demo product, not a real commercial item.
```

## Verificación

`productsDemo.test.ts` comprueba conservación, reemplazo y eliminación de metadatos
sin mutar ejemplos. `product-photos.spec.ts` comprueba carga real, alternativa ante
fallo, archivo inválido/corrupto, descripción requerida, edición y navegación con
foto local en los tres tamaños. Guarda capturas de catálogo y detalle con imágenes
en `test-results/`; esos artefactos se regeneran y no forman parte de los assets.
