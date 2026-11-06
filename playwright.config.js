// Browser tests of the main flows (npm run test:e2e). They run against the LOCAL stack only (Next on 3000, Vite on 3200, the test database):
// the setup refuses any database that is not on this computer, creates a throw-away administrator and removes everything it made.
import { defineConfig } from '@playwright/test'

export default defineConfig({
    testDir: 'e2e',
    timeout: 90000,
    expect: { timeout: 15000 },
    workers: 1,
    reporter: 'list',
    globalSetup: './e2e/setup.mjs',
    globalTeardown: './e2e/teardown.mjs',
    use: { baseURL: 'http://localhost:3200', channel: 'chrome', headless: true, viewport: { width: 1400, height: 900 }, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
    webServer: [
        { command: 'npx next dev -p 3000', url: 'http://localhost:3000/api/auth/csrf', reuseExistingServer: true, timeout: 180000 },
        { command: 'cd web && npx vite --port 3200 --strictPort', url: 'http://localhost:3200', reuseExistingServer: true, timeout: 120000 },
    ],
})
