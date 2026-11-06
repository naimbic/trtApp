// Browser tests of the main flows (npm run test:e2e). They run against the LOCAL stack only (Next on 3000, Vite on 3200, the test database):
// the setup refuses any database that is not on this computer, creates a throw-away administrator and removes everything it made.
import { defineConfig } from '@playwright/test'

export default defineConfig({
    testDir: 'e2e',
    timeout: 90000,
    expect: { timeout: 30000 },
    retries: 1, // a first compile of a page on a cold dev server can be slow
    workers: 1,
    reporter: 'list',
    globalSetup: './e2e/setup.mjs',
    globalTeardown: './e2e/teardown.mjs',
    // the period of the lists is fixed to a wide one: a test must not depend on what time it is (the browser and the server may not be on the same day around midnight)
    use: {
        storageState: { cookies: [], origins: [{ origin: 'http://localhost:3200', localStorage: [{ name: 'dashboardFilters', value: JSON.stringify({ state: { range: 'custom', from: '2026-01-01', to: '2099-12-31', currencyId: 'all', accent: 'blue', customHex: '#7c3aed' }, version: 2 }) }] }] }, baseURL: 'http://localhost:3200', channel: 'chrome', headless: true, viewport: { width: 1400, height: 900 }, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
    webServer: [
        { command: 'npx next dev -p 3000', url: 'http://localhost:3000/api/auth/csrf', reuseExistingServer: true, timeout: 180000 },
        { command: 'cd web && npx vite --port 3200 --strictPort', url: 'http://localhost:3200', reuseExistingServer: true, timeout: 120000 },
    ],
})
