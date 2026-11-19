# Validación integrada en backend aislado

Fecha de revisión: **19 de noviembre de 2026**.

Resultado: **4 escenarios integrados correctos y 1 prueba de contrato fallida**.
La prueba fallida no está omitida ni marcada como esperada: `npm run test:integration`
termina con código 1 hasta que backend concilie la moneda del PSP con COP.

## Entorno y aislamiento

Se ejecutó el código backend existente de `ProyectoIngSoftII/backend` sin editarlo,
con frontend real, cuentas sintéticas y una SQLite nueva por ejecución. No se usan
respuestas de API inventadas. La guardia de red deja pasar las peticiones a los
dos servidores temporales y bloquea otros orígenes, incluidas fotos externas.

- Backend revisado: commit `411c322c193289cdb0a51022f029e50698b9a4eb`, árbol limpio.
- SHA-256 de fuentes Python de app: `d18867b22365fdbccdcb59ee76cb4d6fbc67641a34e867a01b4014843009bc95`.
- Node: 22.23.1. Python: 3.14.10. FastAPI: 0.165.0. Pydantic: 2.14.4.
  SQLAlchemy: 2.1.9. bcrypt: 5.0.0. PyJWT: 2.15.1. Uvicorn: 0.54.0.
- Son las versiones efectivamente usadas con las dependencias declaradas del backend.
  El Dockerfile del backend usa Python 3.12: esta evidencia no certifica ese contenedor
  ni que la API compartida ejecute exactamente el mismo snapshot.
- Puertos temporales y origen CORS propios. No se envían escrituras al puerto 8000.
- El harness comprueba el motor y la ruta SQLite antes de iniciar; salud incluye un
  identificador de ejecución para comprobar que las pruebas alcanzan la instancia correcta.
- Backend parte desde un directorio temporal sin su `.env`. Claves de firma de prueba
  aleatorias, transporte saliente limitado a loopback y credenciales sintéticas.
- Al terminar, incluso con fallo, se detienen los procesos propios y se elimina SQLite.
  No se modifican los archivos ni la base de datos de trabajo del otro equipo.

El servicio de notificaciones revisado registra bandeja e intentos en BD. Estas
pruebas no envían correo ni acreditan recepción SMTP. Tampoco usan un PSP bancario:
se ejercita la pasarela de tokens de prueba del backend.

## Resultados observados

| Escenario | Evidencia obtenida |
| --- | --- |
| Administración | Login real, alta desde UI y ajuste por talla desde UI: físico 10, reservado 0, disponible 10. |
| Compra aprobada | Registro real, catálogo, carrito y cambio de cantidad sin afectar inventario. Confirmar 2 unidades dejó físico 10/reservado 2/disponible 8. Pagar tok_ok dejó 8/0/8. |
| Pago repetido del mismo pedido | Repetir checkout devolvió 200 y mantuvo 8/0/8; no descontó otras 2 unidades. Es evidencia secuencial, no de concurrencia global. |
| Compra rechazada | Otro pedido reservó 1 unidad: 8/1/7. tok_declined canceló y liberó: 8/0/8. Repetir checkout rechazado devolvió 409 sin otra liberación. |
| Bandeja e intentos | Un aviso lógico por registro/aprobación aunque se repitió checkout; lectura confirmada en UI, intento deduplicated consultado por administrador. |
| Propiedad y roles | Otro cliente recibió 404 al consultar el pedido o marcar el aviso ajeno; cliente recibió 403 para ajustes e intentos administrativos. |
| JWT | Token inválido y token firmado pero vencido recibieron 401. |
| Contraseñas | El cliente sintético quedó con bcrypt verificable en SQLite. Respuestas de login no incluyeron password/password_hash/hashed_password. |
| Auditoría | Ajuste persistido con anterior 0, nuevo 10, motivo, actor y fecha. |
| Invariantes de la muestra | Sin claves lógicas de notificación duplicadas ni filas de inventario negativas o reservadas por encima del físico. |

La auditoría adicional abre SQLite con `mode=ro` y exporta únicamente booleanos y
conteos; no copia contraseñas, hashes, mensajes o destinatarios a los informes.

## Hallazgo para el equipo backend: moneda del webhook

**Requisito afectado:** SWR-24 (pedido, importe y moneda), con repercusión en la
aceptación de F-06. El contrato distribuido y la interfaz usan COP.

Reproducción automatizada en la base temporal:

1. Crear un pedido propio pendiente con una línea válida.
2. Preparar un evento `approved`, con su ID y el importe exacto del pedido,
   `currency: "COP"` y firma HMAC-SHA256 correcta para la instancia de prueba.
3. Sin firma, la ruta devuelve 401, como corresponde.
4. Con la firma correcta, POST `/api/v1/webhooks/psp` devuelve **400** con
   `detail.code: "INVALID_PSP_AMOUNT"`, en lugar de aceptar la confirmación.

En `backend/app/domain/psp.py`, `apply_psp_event` exige `currency.upper() == "CLP"`.
`checkout_with_card` también construye el evento interno con `currency="CLP"`.
Por ello, la ruta de tokens de prueba puede aprobar mientras el webhook en la
moneda acordada se rechaza. No se cambió frontend a CLP ni se modificó backend
para esconder la diferencia.

**Solicitud concreta para backend:** alinear moneda de autorización interna,
validación del webhook, serialización de pedido/pago y OpenAPI con COP; mantener
verificación de firma e importe, e idempotencia de event_id. Después, repetir
esta misma suite y las pruebas backend de firmas/moneda/importe. Si la moneda
acordada cambiara, actualizar el contrato explícitamente antes de cambiar la UI.

## Reproducir

Se requiere el backend local y un Python con sus dependencias. No se instala
ninguna dependencia Python en el proyecto frontend.

```sh
python3 -m venv /tmp/fashion-integration-venv
/tmp/fashion-integration-venv/bin/python -m pip install -r ../ProyectoIngSoftII/backend/requirements.txt
PLAYWRIGHT_BROWSERS_PATH=/tmp/fashion-playwright npx playwright install chromium --only-shell
FASHION_BACKEND_PYTHON=/tmp/fashion-integration-venv/bin/python \
PLAYWRIGHT_BROWSERS_PATH=/tmp/fashion-playwright npm run test:integration
```

El runner usa por defecto `../ProyectoIngSoftII/backend`. Puede indicarse otro
checkout mediante `FASHION_BACKEND_PATH`; siempre crea otra SQLite y valida su
identidad. La gestión de grupos de procesos está probada en Linux. No se reutiliza
un backend HTTP ya ejecutándose ni se acepta una URL de producción para escribir.

Los resultados locales están en `integration-results/report.json`,
`environment.json`, `database-audit.json` y logs de arranque. Se ignoran en Git;
trazas, vídeo y capturas están desactivados. El error de moneda también queda
adjunto como JSON de estado/código, sin firma ni secreto. Compartir este documento,
no bases de datos o credenciales de prueba.

La suite habitual de frontend sigue separada: `npm run test:e2e` conserva sus
321 pruebas con respuestas interceptadas y no ejecuta estas escrituras integradas.
`playwright.integration.config.ts` solo puede arrancarse con la identidad temporal
preparada por el runner.

## Lo que aún no demuestra esta revisión

No certifica sobreventa bajo clientes concurrentes, reserva atómica de varias
líneas, expiración por tiempo del proceso real, todos los replay/conflictos de
webhook, evento enviado, recepción de mensajes, ni un PSP bancario. Tampoco sustituye
la revisión manual con lector de pantalla o aceptación visual. Estas limitaciones
no se convierten en estados inventados o simulaciones adicionales del frontend.
