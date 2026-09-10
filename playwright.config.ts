import { defineConfig, devices } from '@playwright/test'

const requestedPort = process.env.CLD_E2E_PORT ?? '4173'
const e2ePort = Number(requestedPort)

if (!Number.isInteger(e2ePort) || e2ePort < 1024 || e2ePort > 65535) {
  throw new Error(`CLD_E2E_PORT must be an integer between 1024 and 65535; received ${requestedPort}`)
}

const productionUrl = process.env.CLD_E2E_BASE_URL
if (productionUrl) {
  const parsed = new URL(productionUrl)
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
    throw new Error('CLD_E2E_BASE_URL must be an HTTPS URL without credentials')
  }
}
const baseURL = productionUrl ?? `http://127.0.0.1:${e2ePort}`
const webServerCommand = e2ePort === 4173
  ? 'npm run build && npm run dev:codex'
  : `npm run build && npm exec vite -- --host 127.0.0.1 --port ${e2ePort} --strictPort`

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  timeout: 60_000,
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: productionUrl ? undefined : {
    command: webServerCommand,
    timeout: 180_000,
    url: baseURL,
    reuseExistingServer: false,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
