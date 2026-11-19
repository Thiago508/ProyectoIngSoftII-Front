"""Solo lectura de la SQLite desechable; produce booleanos, nunca contraseñas/hash/mensajes."""
import json
from pathlib import Path
import sqlite3
import sys
import bcrypt

runtime = Path(sys.argv[1]).resolve()
database = runtime / 'integration.sqlite'
if not runtime.name.startswith('fashion-integration-') or not database.is_file():
    raise RuntimeError('No es la base temporal esperada')
with sqlite3.connect(database.as_uri() + '?mode=ro', uri=True) as db:
    user = db.execute('SELECT password_hash FROM users WHERE email = ?', ('cliente.integration@example.com',)).fetchone()
    encoded = user[0].encode() if user else b''
    bcrypt_ok = bool(encoded.startswith((b'$2b$', b'$2a$', b'$2y$')) and bcrypt.checkpw(b'Integration-client-2026!', encoded))
    adjustments = db.execute('SELECT previous_quantity, new_quantity, reason, adjusted_by_id, created_at FROM inventory_adjustments').fetchall()
    audit_ok = any(old == 0 and new == 10 and reason == 'Preparación de prueba aislada' and actor and date for old, new, reason, actor, date in adjustments)
    duplicates = db.execute('SELECT COUNT(*) FROM (SELECT dedupe_key FROM notifications GROUP BY dedupe_key HAVING COUNT(*) > 1)').fetchone()[0]
    invalid_stock = db.execute('SELECT COUNT(*) FROM inventory_items WHERE stock_on_hand < 0 OR reserved_qty < 0 OR reserved_qty > stock_on_hand').fetchone()[0]
    print(json.dumps({'bcryptClientVerified': bcrypt_ok, 'adjustmentAuditVerified': bool(audit_ok), 'duplicateNotificationKeys': duplicates, 'invalidStockRows': invalid_stock}))
