import { defineConfig, devices } from '@playwright/test'

/**
 * E2E testy běží proti produkčnímu buildu (`vite preview`) včetně service workeru.
 * Bez proměnných Supabase se aplikace spustí v režimu „jen v tomto zařízení“,
 * takže testy nepotřebují žádný účet ani síť.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    locale: 'cs-CZ',
    timezoneId: 'Europe/Prague',
    serviceWorkers: 'allow',
  },
  webServer: {
    // samostatný build bez Supabase (i kdyby existoval soubor .env.local)
    command: 'npx vite build --mode e2e --outDir dist-e2e && npx vite preview --outDir dist-e2e --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 180_000,
    env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' },
  },
  projects: [
    { name: 'iphone', use: { ...devices['iPhone 13'], browserName: 'chromium', defaultBrowserType: 'chromium' } },
    { name: 'ipad', use: { ...devices['iPad Pro 11 landscape'], browserName: 'chromium', defaultBrowserType: 'chromium' } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
})
