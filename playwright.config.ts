import { defineConfig, devices } from '@playwright/test'

const requestedPort = process.env.CLD_E2E_PORT ?? '4173'
const e2ePort = Number(requestedPort)

if (!Number.isInteger(e2ePort) || e2ePort < 1024 || e2ePort > 65535) {
  throw new Error(`CLD_E2E_PORT must be an integer between 1024 and 65535; received ${requestedPort}`)
}

const baseURL = `http://127.0.0.1:${e2ePort}`
const webServerCommand = e2ePort === 4173
  ? 'npm run build && npm run dev:codex'
  : `npm run build && npm exec vite -- --host 127.0.0.1 --port ${e2ePort} --strictPort`

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: {
    command: webServerCommand,
    url: baseURL,
    reuseExistingServer: false,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
