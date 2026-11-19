import { spawn, execFileSync } from 'node:child_process';
import { createWriteStream, existsSync } from 'node:fs';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import net from 'node:net';
import { once } from 'node:events';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backend = resolve(process.env.FASHION_BACKEND_PATH ?? join(root, '../ProyectoIngSoftII/backend'));
const python = process.env.FASHION_BACKEND_PYTHON ?? 'python3';
if (!existsSync(join(backend, 'app/main.py'))) throw new Error('Configura FASHION_BACKEND_PATH con el backend existente.');
const runtime = await mkdtemp(join(tmpdir(), 'fashion-integration-'));
const reportDir = join(root, 'integration-results');
await mkdir(reportDir, { recursive: true });
const processes = [];
const logs = [];
let interrupted = false;
function stopAll() { for (const child of [...processes].reverse()) { try { process.kill(-child.pid, 'SIGTERM'); } catch { /* Ya terminó. */ } } }
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { interrupted = true; stopAll(); });
function start(command, args, options = {}) {
  const child = spawn(command, args, { cwd: root, env: process.env, detached: true, ...options });
  processes.push(child); child.on('error', () => {}); return child;
}
function freePort() { return new Promise((resolvePort, reject) => { const server = net.createServer(); server.once('error', reject); server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(() => resolvePort(port)); }); }); }
async function ready(url, child, runId) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline && !interrupted) {
    if (child.exitCode !== null) throw new Error('Terminó un servidor de prueba antes de estar disponible. Revisa integration-results.');
    try { const response = await fetch(url, { signal: AbortSignal.timeout(1000) }); if (response.ok && (!runId || response.headers.get('x-fashion-integration-run') === runId)) return; } catch { /* Todavía inicia. */ }
    await new Promise((resolveWait) => setTimeout(resolveWait, 200));
  }
  throw new Error('No se confirmó la identidad/disponibilidad de los servidores aislados.');
}
async function sourceHash() {
  const hash = createHash('sha256');
  async function visit(directory) { for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) { const path = join(directory, entry.name); if (entry.isDirectory() && entry.name !== '__pycache__') await visit(path); else if (entry.isFile() && entry.name.endsWith('.py')) { hash.update(path.slice(backend.length)); hash.update(await readFile(path)); } } }
  await visit(join(backend, 'app')); return hash.digest('hex');
}
try {
  const backendPort = await freePort(); let frontendPort = await freePort();
  while (frontendPort === backendPort) frontendPort = await freePort();
  const runId = randomUUID(); const api = `http://127.0.0.1:${backendPort}/api/v1`; const front = `http://127.0.0.1:${frontendPort}`;
  const env = { ...process.env, PYTHONDONTWRITEBYTECODE: '1', PYTHONPATH: backend, DATABASE_URL: `sqlite:///${join(runtime, 'integration.sqlite')}`, ENVIRONMENT: 'integration', DEBUG: 'false', ALLOWED_ORIGINS: JSON.stringify([front]), SECRET_KEY: randomUUID(), PSP_WEBHOOK_SECRET: randomUUID(), ADMIN_EMAIL: 'admin.integration@example.com', ADMIN_PASSWORD: 'Integration-only-2026!', ADMIN_NAME: 'Administrador de integración', APPROVED_CARD_TOKEN: 'tok_ok', DECLINED_CARD_TOKEN: 'tok_declined', FASHION_INTEGRATION_DIR: runtime, FASHION_INTEGRATION_RUN: runId, FASHION_INTEGRATION_PORT: String(backendPort) };
  const backendLog = createWriteStream(join(reportDir, 'backend.log'), { flags: 'w' });
  logs.push(backendLog); await once(backendLog, 'open');
  const backendProcess = start(python, [join(root, 'scripts/start-integration-backend.py')], { cwd: runtime, env, stdio: ['ignore', backendLog, backendLog] });
  await ready(`${api}/health`, backendProcess, runId);
  const identity = JSON.parse(await readFile(join(runtime, 'isolation.json'), 'utf8'));
  if (identity.runId !== runId || identity.database !== join(runtime, 'integration.sqlite')) throw new Error('No se pudo verificar SQLite aislada.');
  const frontendLog = createWriteStream(join(reportDir, 'frontend.log'), { flags: 'w' });
  logs.push(frontendLog); await once(frontendLog, 'open');
  const frontendProcess = start('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(frontendPort), '--strictPort'], { env: { ...process.env, VITE_API_URL: api, VITE_CATALOG_SOURCE: 'api' }, stdio: ['ignore', frontendLog, frontendLog] });
  await ready(front, frontendProcess);
  let revision = 'unavailable'; let dirty = null;
  try { revision = execFileSync('git', ['-C', backend, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); dirty = Boolean(execFileSync('git', ['-C', backend, 'status', '--porcelain'], { encoding: 'utf8' }).trim()); } catch { /* El hash de código también identifica el snapshot. */ }
  await writeFile(join(reportDir, 'environment.json'), JSON.stringify({ backendRevision: revision, backendDirty: dirty, backendSourceHash: await sourceHash(), packages: JSON.parse(execFileSync(python, ['-c', 'import importlib.metadata as m,json;print(json.dumps({p:m.version(p) for p in ["fastapi","pydantic","sqlalchemy","bcrypt","PyJWT","uvicorn"]}))'], { encoding: 'utf8' })), node: process.version, python: execFileSync(python, ['--version'], { encoding: 'utf8' }).trim(), isolation: 'fresh temporary SQLite, removed after run', outboundBackend: 'loopback only' }, null, 2));
  const testEnv = { ...process.env, FASHION_INTEGRATION_API: api, FASHION_INTEGRATION_FRONT: front, FASHION_INTEGRATION_RUN: runId, FASHION_INTEGRATION_DIR: runtime, FASHION_INTEGRATION_ADMIN_EMAIL: env.ADMIN_EMAIL, FASHION_INTEGRATION_ADMIN_PASSWORD: env.ADMIN_PASSWORD, FASHION_INTEGRATION_PSP_SECRET: env.PSP_WEBHOOK_SECRET, FASHION_INTEGRATION_JWT_SECRET: env.SECRET_KEY, FASHION_BACKEND_PYTHON: python };
  const tests = start(process.execPath, [join(root, 'node_modules/@playwright/test/cli.js'), 'test', '--config', 'playwright.integration.config.ts'], { env: testEnv, stdio: 'inherit' });
  const watchdog = setInterval(() => { if (backendProcess.exitCode !== null || frontendProcess.exitCode !== null || interrupted) { try { process.kill(-tests.pid, 'SIGTERM'); } catch { /* Ya terminó. */ } } }, 250);
  const code = await new Promise((resolveExit) => tests.once('exit', (value) => resolveExit(value ?? 1)));
  clearInterval(watchdog);
  let finalCode = code;
  try {
    const audit = execFileSync(python, [join(root, 'scripts/audit-integration-db.py'), runtime], { encoding: 'utf8' });
    const evidence = JSON.parse(audit);
    await writeFile(join(reportDir, 'database-audit.json'), JSON.stringify(evidence, null, 2));
    if (!evidence.bcryptClientVerified || !evidence.adjustmentAuditVerified || evidence.duplicateNotificationKeys !== 0 || evidence.invalidStockRows !== 0) { console.error('La auditoría de la base temporal no cumplió sus comprobaciones.'); finalCode = 1; }
  } catch { await writeFile(join(reportDir, 'database-audit.json'), JSON.stringify({ available: false })); finalCode = 1; }
  process.exitCode = finalCode;
} catch (cause) {
  console.error(cause instanceof Error ? cause.message : 'No se pudo preparar la integración aislada.'); process.exitCode = 1;
} finally {
  stopAll();
  await new Promise((resolveWait) => setTimeout(resolveWait, 400));
  for (const child of processes) { try { process.kill(-child.pid, 'SIGKILL'); } catch { /* Ya terminó. */ } }
  for (const log of logs) log.end();
  await rm(runtime, { recursive: true, force: true });
}
