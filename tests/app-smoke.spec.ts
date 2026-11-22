import { expect, test } from '@playwright/test'

/** App smoke tests: sign-in gate, login and password reset, paywall, accessibility and redirects to the website. */

test('app routes require sign-in (or show setup when Supabase is not configured)', async ({ page }) => {
  for (const path of ['/today', '/train', '/onboarding']) {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Supabase|Přihlášení|Sign in/)
  }
})

test('paywall explains Pro and links to pricing on the website', async ({ page }) => {
  await page.goto('/preview/paywall')
  const p = page.getByTestId('paywall')
  await expect(p).toContainText('Fotky pokroku jsou v Pro')
  await expect(p.getByRole('link', { name: 'Zobrazit tarify' })).toHaveAttribute(
    'href',
    /^https?:\/\/[^/]+\/pricing$/,
  )
})

test('password reset: the login form switches to an email-only reset form; a stale reset link explains itself', async ({
  page,
}) => {
  await page.goto('/login')
  const forgot = page.getByTestId('forgot-password')
  // without Supabase keys (CI) the page is a setup notice instead of the form
  test.skip(!(await forgot.isVisible()), 'Supabase not configured')
  await expect(page.getByTestId('link-expired')).toHaveCount(0)
  await forgot.click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Obnova hesla|Reset password/)
  await expect(page.locator('input[type="email"]')).toBeVisible()
  await expect(page.locator('input[type="password"]')).toHaveCount(0)
  // the request is answered here, never by the real project (no e-mails are sent)
  let calls = 0
  await page.route('**/auth/v1/recover**', (route) => {
    calls++
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })
  await page.locator('input[type="email"]').fill('reset-test@example.test')
  await page.getByRole('button', { name: /Poslat odkaz|Send link/ }).click()
  await expect(page.getByRole('status')).toContainText(/odkaz|link/)
  // resend waits out a cooldown so nobody hammers Supabase's e-mail limit
  await expect(page.getByTestId('resend')).toBeDisabled()
  expect(calls).toBe(1)

  await page.goto('/login')
  await page.getByTestId('forgot-password').click()
  await page.getByRole('button', { name: /Zpět na přihlášení|Back to sign in/ }).click()
  await expect(page.locator('input[type="password"]')).toBeVisible()

  // a failed confirmation link lands on the login page with an explanation
  await page.goto('/login?error=callback')
  await expect(page.getByTestId('link-expired')).toBeVisible()

  // no session (expired or reused link) → explanation and a way back, not a dead form
  await page.goto('/reset-password')
  await expect(page.getByText(/vypršel|expired/)).toBeVisible()
  await expect(page.getByRole('link', { name: /Zpět na přihlášení|Back to sign in/ })).toHaveAttribute(
    'href',
    '/login',
  )
  // "send a new link" opens the reset form directly
  await page.getByRole('link', { name: /Poslat nový odkaz|Send a new link/ }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Obnova hesla|Reset password/)
})

test('accessibility: no serious or critical axe violations on app screens, login and reset', async ({
  page,
}) => {
  test.setTimeout(120_000)
  const screens = [
    'train',
    'library',
    'eat',
    'stack',
    'pain-map',
    'routine',
    'labs',
    'coach',
    'looks',
    'progress',
    'weight',
    'photos',
    'paywall',
  ]
  // the diary also with the search open and an allergy warning shown (vegetarian with a nut allergy)
  for (const path of [
    '/login',
    '/reset-password',
    '/preview/eat?add=almonds',
    '/preview/today',
    '/preview/mobility',
    '/preview/supplements',
    ...screens.map((s) => `/preview/${s}`),
  ]) {
    await page.goto(path)
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' })
    const violations = await page.evaluate(async () => {
      const r = await (
        window as unknown as {
          axe: { run: (c: unknown, o: unknown) => Promise<{ violations: { id: string; impact: string }[] }> }
        }
      ).axe.run(document, { resultTypes: ['violations'] })
      return r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)
    })
    expect(violations, path).toEqual([])
  }
})

test('Content-Security-Policy is sent and blocks nothing the app needs', async ({ page }) => {
  const blocked: string[] = []
  page.on('console', (m) => {
    if (/Content Security Policy/i.test(m.text())) blocked.push(m.text().slice(0, 200))
  })
  const res = await page.goto('/login')
  expect(res?.headers()['content-security-policy']).toContain("default-src 'self'")
  for (const path of ['/preview/eat', '/preview/train', '/preview/coach']) {
    await page.goto(path)
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
  }
  expect(blocked).toEqual([])
})

test('public pages are sent to the website; the app itself is not indexed', async ({ request }) => {
  for (const path of ['/food/almonds', '/jak-funguje-telo/bilkoviny', '/privacy', '/pricing']) {
    const res = await request.get(path, { maxRedirects: 0 })
    expect(res.status(), path).toBe(307)
    expect(res.headers()['location'], path).toMatch(
      new RegExp(`^https?://[^/]+${path.replace(/\//g, '\\/')}$`),
    )
  }
  expect(await (await request.get('/robots.txt')).text()).toContain('Disallow: /')
})

test('a deep link keeps its query through the login redirect (food from the website → diary)', async ({
  request,
}) => {
  const res = await request.get('/eat?add=almonds', { maxRedirects: 0 })
  // without Supabase keys (CI) the app shows a setup screen instead of redirecting
  test.skip(res.status() !== 307, 'Supabase not configured')
  expect(res.headers()['location']).toContain(`next=${encodeURIComponent('/eat?add=almonds')}`)
})
