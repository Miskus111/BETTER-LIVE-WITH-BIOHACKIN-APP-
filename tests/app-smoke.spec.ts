import { expect, test } from '@playwright/test'
import { gzipSync } from 'node:zlib'

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
    'body',
    'store',
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

test('accessibility: diary states that appear only after interaction', async ({ page }) => {
  const check = async (state: string) => {
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' })
    const violations = await page.evaluate(async () => {
      const r = await (
        window as unknown as {
          axe: { run: (c: unknown, o: unknown) => Promise<{ violations: { id: string; impact: string }[] }> }
        }
      ).axe.run(document, { resultTypes: ['violations'] })
      return r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)
    })
    expect(violations, state).toEqual([])
  }
  // the database is answered here (never the real project): the delete fails
  await page.route('**/rest/v1/food_logs**', (route) => route.fulfill({ status: 500, body: '{}' }))
  await page.goto('/preview/eat')
  const snack = page.getByTestId('meal-snack')
  await snack.getByRole('button', { name: /Přidat|Add/ }).click()
  await expect(page.getByTestId('diary-recent')).toBeVisible()
  await check('picker open with recent foods')
  await snack.getByRole('textbox').first().fill('jogrt')
  await expect(page.getByTestId('diary-no-food')).toBeVisible()
  await check('no results with a typo fix')
  await page.getByRole('button', { name: 'Smazat', exact: true }).first().click()
  await expect(page.getByTestId('diary-no-food')).toBeVisible()
  await check('after a failed delete')
})

test('installable on phones: manifest icons and an iOS home-screen icon, all public PNGs', async ({
  page,
  request,
}) => {
  await page.goto('/login')
  const apple = page.locator('link[rel="apple-touch-icon"]')
  await expect(apple).toHaveAttribute('sizes', '180x180')
  const manifest = await (await request.get('/manifest.webmanifest')).json()
  for (const href of [
    await apple.getAttribute('href'),
    ...manifest.icons.map((i: { src: string }) => i.src),
  ]) {
    const res = await request.get(href!, { maxRedirects: 0 })
    expect(res.status(), href!).toBe(200)
    expect(res.headers()['content-type'], href!).toBe('image/png')
  }
})

test('keyboard focus is visible on text boxes that hide their own outline', async ({ page }) => {
  // the frame around the input lights up (cyan), since the input itself draws no outline
  const borderOf = (sel: string) =>
    page
      .locator(sel)
      .first()
      .evaluate((el) => getComputedStyle(el).borderTopColor)
  await page.goto('/preview/library')
  const idle = await borderOf('label.field')
  await page.locator('label.field input').first().focus()
  expect(await borderOf('label.field')).not.toBe(idle)
  await page.goto('/preview/coach')
  const form = 'form:has(textarea)'
  const before = await page.locator(form).evaluate((el) => getComputedStyle(el).borderTopColor)
  await page.locator('textarea').first().focus()
  await expect
    .poll(() => page.locator(form).evaluate((el) => getComputedStyle(el).borderTopColor))
    .not.toBe(before)
})

test('keyboard: the first Tab offers a skip link past the navigation', async ({ page }) => {
  await page.goto('/preview/today')
  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: /Přeskočit na obsah|Skip to content/ })
  await expect(skip).toBeFocused()
  await expect(skip).toHaveAttribute('href', '#main')
  await expect(page.locator('main#main')).toHaveCount(1)
})

test('keyboard: Escape closes the exercise picker, whose close button is labelled "close"', async ({
  page,
}) => {
  await page.goto('/preview/train')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.getByTestId('start-workout').click()
  await expect(page).toHaveURL(/\/preview\/session/)
  await page.getByTestId('add-exercise').focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: /Zavřít|Close/ })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  // focus is back on the button that opened it, not lost at the top of the page
  await expect(page.getByTestId('add-exercise')).toBeFocused()
})

test('keyboard: Escape closes an opened progress photo', async ({ page }) => {
  await page.goto('/preview/photos')
  const thumb = page.getByTestId('gallery').locator('li button').first()
  await thumb.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(thumb).toBeFocused()
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

test('JavaScript budget: login and the screens bundle stay light (gzip)', async ({ request }) => {
  // ~10 % above the sizes measured on 22 Nov 2026. All previews share one page that bundles every screen, so
  // that number is a ceiling for the whole app; a jump usually means a large data file reached the browser.
  const budget: Record<string, number> = { '/login': 225, '/preview/today': 610 }
  for (const [path, maxKb] of Object.entries(budget)) {
    const html = await (await request.get(path)).text()
    const srcs = [...new Set([...html.matchAll(/src="(\/_next\/static\/[^"]+\.js)"/g)].map((m) => m[1]))]
    let bytes = 0
    for (const src of srcs) bytes += gzipSync(await (await request.get(src)).body()).length
    expect(Math.round(bytes / 1024), `${path} JS (KB gzip)`).toBeLessThanOrEqual(maxKb)
  }
})
