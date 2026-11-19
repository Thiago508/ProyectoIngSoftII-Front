import { defineConfig, devices } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
const runtime = process.env.FASHION_INTEGRATION_DIR;
if (!runtime || !resolve(runtime).startsWith(join(tmpdir(), 'fashion-integration-'))) throw new Error('Usa npm run test:integration para preparar una instancia aislada.');
const identity = JSON.parse(readFileSync(join(runtime, 'isolation.json'), 'utf8')) as { runId?: string; database?: string };
if (identity.runId !== process.env.FASHION_INTEGRATION_RUN || identity.database !== join(runtime, 'integration.sqlite')) throw new Error('No coincide la identidad del entorno aislado.');
export default defineConfig({
  testDir: './tests/integration', fullyParallel: false, workers: 1, retries: 0, timeout: 90000,
  use: { baseURL: process.env.FASHION_INTEGRATION_FRONT, trace: 'off', video: 'off', screenshot: 'off' },
  projects: [{ name: 'isolated-desktop', use: { ...devices['Desktop Chrome'] } }],
  reporter: [['list'], ['json', { outputFile: 'integration-results/report.json' }]],
  outputDir: 'integration-results/test-results',
});
