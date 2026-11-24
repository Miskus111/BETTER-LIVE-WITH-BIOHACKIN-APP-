import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.PORT ?? 3100)

export default defineConfig({
  testDir: './tests',
  timeout: 45_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  // reducedMotion: the beating heart / breathing lungs never settle, so clicks would wait forever;
  // this also exercises the prefers-reduced-motion path.
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure', reducedMotion: 'reduce' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    // production build: what users get, and it does not collide with a running `npm run dev`
    command: `NEXT_DIST_DIR=.next-test npm run build && ENABLE_PREVIEW=1 NEXT_DIST_DIR=.next-test npx next start -p ${PORT}`,
    // never the real project or a paid API, whatever .env.local holds: Supabase points at a closed local port
    // (requests fail fast, so the app sees a logged-out visitor) and the secret keys are dummies.
    // Tests that need a database reply answer it themselves with page.route.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54399',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'e2e-anon-key-not-a-real-project',
      SUPABASE_SERVICE_ROLE_KEY: 'e2e-disabled',
      ANTHROPIC_API_KEY: 'e2e-disabled',
    },
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 300_000,
  },
})
