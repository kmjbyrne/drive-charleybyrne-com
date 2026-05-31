import { defineConfig, devices } from '@playwright/test'
import { config } from 'dotenv'

config()

const TEST_PORT = '3002'
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${TEST_PORT}`
const isProduction = !!process.env.PLAYWRIGHT_BASE_URL

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  timeout: 60000,
  use: {
    baseURL,
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: 'unauthenticated',
      testMatch: '**/auth.spec.ts',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: isProduction
    ? undefined
    : {
        command: 'npm run dev',
        url: `http://localhost:${TEST_PORT}`,
        reuseExistingServer: false,
        timeout: 120000,
        env: {
          NODE_ENV: 'test',
          PORT: TEST_PORT,
          NITRO_PORT: TEST_PORT,
          NUXT_IGNORE_LOCK: '1'
        }
      }
})
