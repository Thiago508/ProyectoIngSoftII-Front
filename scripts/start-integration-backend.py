"""Harness de pruebas: importa backend existente sin modificarlo ni usar su .env/BD."""
import ipaddress
import json
import os
from pathlib import Path
import socket
import sys

sys.dont_write_bytecode = True
runtime = Path(os.environ['FASHION_INTEGRATION_DIR']).resolve()
expected_db = runtime / 'integration.sqlite'
if Path.cwd().resolve() != runtime or not runtime.name.startswith('fashion-integration-'):
    raise RuntimeError('El backend de prueba debe iniciarse en un directorio temporal propio')

# El backend revisado usa servicios locales. Este cierre también impide transporte externo futuro.
original_connect = socket.socket.connect

def local_connect(sock, address):
    if isinstance(address, tuple):
        host = address[0]
        if host != 'localhost':
            try:
                permitted = ipaddress.ip_address(host).is_loopback
            except ValueError:
                permitted = False
            if not permitted:
                raise RuntimeError('La integración aislada no permite conexiones externas')
    return original_connect(sock, address)

socket.socket.connect = local_connect
from app.core.config import get_settings
settings = get_settings()
if settings.database_url != f'sqlite:///{expected_db}':
    raise RuntimeError('La URL de base de datos no coincide con el archivo aislado')
from app.main import create_app
from app.db.session import engine
if engine.url.get_backend_name() != 'sqlite' or Path(engine.url.database).resolve() != expected_db:
    raise RuntimeError('El motor no utiliza SQLite temporal')

application = create_app()
run_id = os.environ['FASHION_INTEGRATION_RUN']

@application.middleware('http')
async def identify_isolated_run(request, call_next):
    response = await call_next(request)
    response.headers['X-Fashion-Integration-Run'] = run_id
    return response

(runtime / 'isolation.json').write_text(json.dumps({'runId': run_id, 'database': str(expected_db)}))
import uvicorn
uvicorn.run(application, host='127.0.0.1', port=int(os.environ['FASHION_INTEGRATION_PORT']), log_level='warning', access_log=False)
