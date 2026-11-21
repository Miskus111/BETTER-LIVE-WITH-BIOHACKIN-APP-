import { expect, test } from '@playwright/test'

/**
 * Responsive pass: screenshots at 390 / 768 / 1440 px into test-results/screens and a check that no page
 * scrolls horizontally. Review the images after running `npm run test:e2e`.
 */
const WIDTHS = [390, 768, 1440]
const PAGES = [
  ['app-train', '/preview/train'],
  ['app-library', '/preview/library'],
  ['app-eat', '/preview/eat'],
  ['app-stack', '/preview/stack'],
  ['app-pain-map', '/preview/pain-map'],
  ['app-routine', '/preview/routine'],
  ['app-labs', '/preview/labs'],
  ['app-coach', '/preview/coach'],
  ['app-looks', '/preview/looks'],
  ['app-progress', '/preview/progress'],
  ['app-weight', '/preview/weight'],
  ['app-photos', '/preview/photos'],
  ['app-paywall', '/preview/paywall'],
  ['login', '/login'],
  ['reset-password', '/reset-password'],
] as const

// one test per page and width: a slow page can't eat the others' time budget, and a failure names the page
for (const width of WIDTHS) {
  for (const [name, path] of PAGES) {
    test(`screen ${name} @${width}px`, async ({ page }) => {
      test.setTimeout(90_000) // full-page shots of long pages are slow on a busy machine
      await page.setViewportSize({ width, height: width < 768 ? 844 : width < 1440 ? 1024 : 900 })
      await page.goto(path)
      // app screens prefetch protected routes; logged out, those streams never close, so cap the wait
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
      await page.waitForTimeout(900)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow, `${path} overflows horizontally at ${width}px`).toBeLessThanOrEqual(0)
      await page.screenshot({ path: `test-results/screens/${width}-${name}.png`, fullPage: true })
    })
  }
}
