# Entrega del frontend con Docker Compose

Requiere Docker Engine y Docker Compose. Ejecutar los comandos desde la raíz
de este repositorio. El backend conserva su Compose independiente.

## Iniciar en el mismo equipo que el backend

Con el backend disponible en `http://127.0.0.1:8000`:

```sh
docker compose up -d --build
docker compose ps
docker compose logs --tail=50 frontend
```

Abrir `http://localhost:8080/catalog`. El frontend consulta
`http://127.0.0.1:8000/api/v1`; el backend debe permitir mediante CORS el origen
`http://localhost:8080`. Si se abre por `http://127.0.0.1:8080`, ese es otro origen
y también debe estar permitido. No se cambian los datos ni el Compose del backend.

Si `8080` ya está ocupado, se puede usar otro puerto:

```sh
FRONTEND_PORT=8081 docker compose up -d --build
```

En ese caso abrir `http://localhost:8081/catalog` y permitir ese origen en CORS.
Para conservar la elección, establecer `FRONTEND_PORT=8081` en `.env.docker.local`
y usar `--env-file .env.docker.local`.

## Cambiar dirección o puerto

```sh
cp .env.docker.example .env.docker.local
```

Editar `.env.docker.local`, por ejemplo para acceder desde otros equipos:

```dotenv
VITE_API_URL=http://192.168.1.50:8000/api/v1
FRONTEND_PORT=8080
```

```sh
docker compose --env-file .env.docker.local up -d --build
```

Usar la IP real del equipo que ejecuta el backend. El navegador debe poder llegar
a ella; `localhost` apunta al equipo del visitante y un nombre Docker como `backend`
normalmente solo se resuelve entre contenedores. Permitir en CORS el origen real
del frontend, por ejemplo `http://192.168.1.50:8080`, y habilitar los puertos necesarios
en la red. Si el frontend se sirve mediante HTTPS, la API también debe usar HTTPS.

Vite integra `VITE_API_URL` durante la compilación: cambiarla requiere reconstruir
la imagen con `--build`. Un `docker compose restart` no cambia esa URL. El archivo
de ejemplo es configuración pública; no colocar tokens ni contraseñas. Los `.env`
locales no se envían al contexto Docker y `.env.docker.local` está ignorado por Git.

Usar el mismo `--env-file` en los siguientes comandos si se personalizó la configuración.

## Verificar la entrega

1. `docker compose ps` debe mostrar el frontend como `healthy`.
2. `curl -f http://localhost:8080/healthz` debe responder `ok`.
3. Abrir `/catalog`, `/login` y `/checkout/review?source=api` directamente y recargar.
   Nginx entrega `index.html` para que React gestione esas rutas.
4. En las herramientas del navegador, comprobar que las solicitudes apuntan a la
   URL configurada y que no aparecen errores CORS.
5. Con una cuenta de prueba, revisar catálogo, carrito, envío y creación del pedido.
   El pago disponible es la pasarela de prueba del backend.

La salud del contenedor comprueba únicamente el servidor de archivos del frontend;
no certifica que la API esté disponible ni que la compra completa funcione.

### Validación local de esta entrega

La imagen se construyó y Compose alcanzó estado `healthy` en el puerto 8081.
`nginx -t` pasó; salud, catálogo, checkout y administración devolvieron 200 con
fallback SPA; un asset inexistente devolvió 404. Build, lint y 26 pruebas unitarias
también pasaron.

El puerto 8080 estaba ocupado por `proyectoingsoftii-web-1`, que se conservó.
La lectura de la API con `Origin: http://localhost:8081` no devolvió permiso CORS.
Por ello, para usar este nuevo contenedor contra ese backend hay que autorizar ese
origen, o coordinar liberar el puerto 8080 y levantar aquí la configuración predeterminada.
No se modificó el backend ni se realizaron escrituras de negocio para esta validación.

## Detener o transportar

```sh
docker compose down
docker image save -o /tmp/fashion-frontend.tar fashion-online-store-frontend:local
```

Para entregar sin acceso al registro, compartir el archivo, `compose.yaml` y estas
instrucciones. En el equipo receptor:

```sh
docker image load -i /ruta/fashion-frontend.tar
docker compose up -d --no-build
```

La imagen transportada conserva la URL API con la que se construyó. Si cambia,
entregar las fuentes y reconstruir con la nueva configuración. Para construirla
otra vez desde cero: `docker compose build --pull frontend`.

## Decisiones de implementación

- `Dockerfile` usa Node 22 para `npm ci` y el build estricto de TypeScript/Vite.
  La imagen final solo contiene Nginx y `dist`; no ejecuta el servidor de desarrollo.
- `docker/nginx.conf` sirve rutas SPA, conserva en caché los assets con hash y
  permite revalidar el HTML. No actúa como proxy ni añade endpoints de negocio.
- Nginx ejecuta sin root, con sistema de archivos de solo lectura y temporales en
  `/tmp`. El Compose no monta el código ni datos del backend.
- `.dockerignore` limita el contexto a las fuentes necesarias. Los tests se incluyen
  en la etapa de compilación porque el proyecto los comprueba con TypeScript.
- Las etiquetas base se pueden actualizar; para una entrega que exija reproducir
  exactamente las imágenes base, fijar sus digests tras acordar la versión final.
