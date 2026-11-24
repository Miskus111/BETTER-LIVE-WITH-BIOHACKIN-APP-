import { expect, test } from '@playwright/test'

/** Signed-in screens rendered through the test-only /preview route (ENABLE_PREVIEW=1). */

test('workout can be logged offline and is queued for sync', async ({ page, context }) => {
  await page.goto('/preview/train')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.getByTestId('start-workout').click()
  await expect(page).toHaveURL(/\/preview\/session/)

  await page.getByTestId('add-exercise').click()
  await page.getByTestId('exercise-search').fill('bench press')
  await page.getByTestId('pick-barbell-bench-press').click()
  const ex = page.getByTestId('exercise-barbell-bench-press')
  await ex.getByLabel('kg').first().fill('80')
  await ex
    .getByLabel(/Opak|Reps/)
    .first()
    .fill('8')

  await context.setOffline(true)
  await ex.getByTestId('set-done').first().click()
  await expect(page.getByRole('timer')).toBeVisible() // rest timer started
  await expect(ex).toContainText(/1RM/) // e1RM shown

  await page.getByTestId('finish-workout').click()
  await expect(page.getByTestId('saved-offline')).toContainText('1')
  const queued = await page.evaluate(
    () => JSON.parse(localStorage.getItem('blwb-session-v1') ?? '{}').state.queue,
  )
  expect(queued).toHaveLength(1)
  expect(queued[0].exercises[0].sets[0]).toMatchObject({ weightKg: 80, reps: 8, done: true })
  await context.setOffline(false)
  await page.getByRole('link', { name: /Zpět na trénink|Back to training/ }).click()
  await expect(page).toHaveURL(/\/preview\/train$/)
})

test('pain map red flags block the exercise plan', async ({ page }) => {
  await page.goto('/preview/pain-lower-back')
  await page.getByTestId('pain-next').click()
  const flags = page.getByTestId('red-flags')
  for (const b of await flags.locator('[data-testid$="-no"]').all()) await b.click()
  await page.getByTestId('flag-saddle_numbness-yes').click()
  await page.getByTestId('flags-next').click()
  await expect(page.getByTestId('gate-emergency')).toBeVisible()
  await expect(page.getByTestId('pain-plan')).toHaveCount(0)
  // the report can't be stored in the preview (no signed-in user / database): the warning must stay on screen
  await page.waitForTimeout(1500)
  await expect(page.getByTestId('gate-emergency')).toBeVisible()
  // …and says honestly that it wasn't stored
  await expect(page.getByTestId('pain-save-failed')).toBeVisible()
})

test('pain map without red flags shows education and a plan', async ({ page }) => {
  await page.goto('/preview/pain-lower-back')
  await page.getByTestId('pain-next').click()
  for (const b of await page.getByTestId('red-flags').locator('[data-testid$="-no"]').all()) await b.click()
  await page.getByTestId('flags-next').click()
  await page.getByTestId('questions-next').click()
  await expect(page.getByTestId('pain-plan')).toBeVisible()
})

test('supplement stack flags upper limits and medication interactions', async ({ page }) => {
  await page.goto('/preview/stack')
  await expect(page.getByText(/125 µg/).first()).toBeVisible()
  await expect(page.getByText(/horní bezpečný limit|upper safe limit/).first()).toBeVisible()
  await expect(page.getByText(/lékařem|doctor/).first()).toBeVisible()
})

test('food diary shows targets and logged meals', async ({ page }) => {
  await page.goto('/preview/eat')
  await expect(page.getByTestId('eat-targets')).toBeVisible()
  await expect(page.getByTestId('meal-breakfast')).toContainText(/Ovesné vločky|Oats/)
  // a 7-day average under the daily targets (today left out)
  await expect(page.getByTestId('eat-week')).toContainText('5 dní se záznamem')
})

test('food diary warns about foods that clash with the profile (allergy, diet)', async ({ page }) => {
  // the preview profile is vegetarian with a nut allergy
  await page.goto('/preview/eat')
  await page
    .getByTestId('meal-snack')
    .getByRole('button', { name: /Přidat|Add/ })
    .click()
  await page.getByTestId('meal-snack').getByRole('textbox').first().fill('mandle')
  await expect(page.getByTestId('diary-conflict').first()).toContainText('Ořechy')
  await page.getByTestId('meal-snack').getByRole('textbox').first().fill('hovězí')
  await expect(page.getByTestId('diary-conflict').first()).toContainText(/vegetarián/i)
})

test('food diary says when nothing matches and offers a typo fix', async ({ page }) => {
  await page.goto('/preview/eat')
  await page
    .getByTestId('meal-snack')
    .getByRole('button', { name: /Přidat|Add/ })
    .click()
  const box = page.getByTestId('meal-snack').getByRole('textbox').first()
  await box.fill('jogrt')
  await expect(page.getByTestId('diary-no-food')).toContainText('Nic jsme nenašli')
  await page.getByRole('button', { name: 'Mysleli jste „jogurt“?' }).click()
  await expect(box).toHaveValue('jogurt')
  await expect(page.getByTestId('diary-no-food')).toHaveCount(0)
})

test('food diary offers the foods you often eat at that meal', async ({ page }) => {
  await page.goto('/preview/eat')
  await page
    .getByTestId('meal-snack')
    .getByRole('button', { name: /Přidat|Add/ })
    .click()
  const recent = page.getByTestId('diary-recent')
  // the apple was a snack twice (last time 180 g), the yogurt once at breakfast
  await expect(recent.getByRole('button').first()).toHaveText('Jablko · 180 g')
  await expect(recent.getByRole('button')).toHaveCount(2)
  await page.getByTestId('meal-snack').getByRole('textbox').first().fill('ban')
  await expect(recent).toHaveCount(0)
})

test('food diary tells you when deleting an entry fails (no silent failure)', async ({ page }) => {
  // the database is answered here (never the real project): the delete fails
  await page.route('**/rest/v1/food_logs**', (route) =>
    route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"down"}' }),
  )
  await page.goto('/preview/eat')
  await page.getByRole('button', { name: 'Smazat', exact: true }).first().click()
  await expect(page.getByRole('alert').filter({ hasText: 'Záznam se nepodařilo smazat' })).toBeVisible()
  await expect(page.getByTestId('diary-undo')).toHaveCount(0)
})

test('food diary: a deleted entry can be put back with the same values', async ({ page }) => {
  // the database is answered here (never the real project)
  const calls: { method: string; body: unknown }[] = []
  await page.route('**/rest/v1/food_logs**', (route) => {
    const req = route.request()
    calls.push({ method: req.method(), body: req.postDataJSON?.() ?? null })
    return route.fulfill({ status: req.method() === 'POST' ? 201 : 204, body: '' })
  })
  await page.goto('/preview/eat')
  await page.getByRole('button', { name: 'Smazat', exact: true }).first().click()
  const bar = page.getByTestId('diary-undo')
  await expect(bar).toContainText('Smazáno: Ovesné vločky')
  await bar.getByRole('button', { name: 'Vrátit' }).click()
  await expect(bar).toHaveCount(0)
  expect(calls.map((c) => c.method)).toEqual(['DELETE', 'POST'])
  expect(calls[1].body).toMatchObject({
    meal: 'breakfast',
    title: 'Ovesné vločky|oats',
    logged_on: '2026-11-16',
  })
})

test('supplement stack tells you when ticking a dose or removing fails', async ({ page }) => {
  // the database is answered here (never the real project): every write fails
  await page.route('**/rest/v1/{supplement_logs,user_supplements}**', (route) =>
    route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"down"}' }),
  )
  await page.goto('/preview/stack')
  await page
    .getByRole('button', { name: /Užito|Taken/ })
    .first()
    .click()
  await expect(page.getByTestId('stack-error')).toContainText('Doplněk se nepodařilo uložit')
})

test('body tab: own data stays in the app, the body map opens on the website', async ({ page }) => {
  await page.goto('/preview/body')
  await expect(page.getByTestId('weight-link')).toHaveAttribute('href', '/body/weight')
  await expect(page.getByTestId('photos-link')).toHaveAttribute('href', '/body/photos')
  await expect(page.getByTestId('body-map-link')).toHaveAttribute('href', /^https:\/\/[^/]+\/$/)
  await expect(page.getByTestId('body-map-link')).toContainText('Mapa těla')
})

test('mobility routine player steps through exercises', async ({ page }) => {
  await page.goto('/preview/routine')
  await page.getByTestId('routine-next').click()
  await page.getByTestId('routine-next').click()
  await expect(page.locator('h2').first()).toBeVisible()
})

test('labs: pasted results are parsed on-device and must be reviewed before saving', async ({ page }) => {
  await page.goto('/preview/labs')
  await expect(page.getByTestId('lab-vitd')).toBeVisible()
  await page.getByRole('tab', { name: /Vložit text|Paste text/ }).click()
  await page
    .getByTestId('labs-text')
    .fill('S-Glukóza 6,1 mmol/l 3,9 - 5,6\nFeritin 12 ug/l 30 - 300\nNěco jiného bez čísla')
  await page.getByTestId('labs-parse').click()
  const review = page.getByTestId('labs-review')
  await expect(review).toBeVisible()
  await expect(review.locator('tbody tr')).toHaveCount(2)
  await expect(review).toContainText(/vysoké|high/)
  await expect(review).toContainText(/nízké|low/)
})

test('coach: emergency messages get a fixed safety reply', async ({ page }) => {
  await page.goto('/preview/coach')
  await page.getByTestId('coach-input').fill('Mám silnou bolest na hrudi při běhu')
  await page.getByTestId('coach-input').press('Enter')
  await expect(page.getByTestId('msg-assistant')).toContainText('112')
})

test('PWA: manifest, icons and offline page are served', async ({ request, page }) => {
  const m = await (await request.get('/manifest.webmanifest')).json()
  expect(m.short_name).toBe('BLWB')
  expect(m.start_url).toBe('/today')
  const icon = await request.get('/pwa-icon/192')
  expect(icon.headers()['content-type']).toContain('image/png')
  expect((await request.get('/sw.js')).ok()).toBe(true)
  await page.goto('/offline')
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/offline/i)
})

test('looks: habits can be ticked off and survive a reload', async ({ page }) => {
  await page.goto('/preview/looks')
  await page.evaluate(() => localStorage.removeItem('blwb-looks-v1'))
  await page.reload()
  const habit = page.getByTestId('habit-spanek')
  await habit.click()
  await expect(habit).toHaveAttribute('aria-pressed', 'true')
  await page.reload()
  await expect(page.getByTestId('habit-spanek')).toHaveAttribute('aria-pressed', 'true')
})

test('progress: weekly volume and strength charts render with a table view', async ({ page }) => {
  await page.goto('/preview/progress')
  await expect(page.getByTestId('volume-chart').locator('.recharts-bar-rectangle').first()).toBeVisible()
  await expect(page.getByTestId('strength-chart').locator('.recharts-line-curve')).toBeVisible()
  await page.getByText('Zobrazit jako tabulku').first().click()
  await expect(page.locator('table').first()).toContainText('kg')
})

test('weight: trend chart, stats and entries render from weigh-ins', async ({ page }) => {
  await page.goto('/preview/weight')
  await expect(page.getByTestId('weight-chart').locator('.recharts-line-curve')).toBeVisible()
  await expect(page.getByTestId('waist-chart')).toBeVisible()
  await expect(page.getByText('Aktuálně (trend)')).toBeVisible()
  await page.getByRole('button', { name: '30 dní' }).click()
  await expect(page.getByRole('button', { name: '30 dní' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('tbody tr').first()).toContainText('kg')
})

test('photos: filter by pose and compare two photos side by side or with a slider', async ({ page }) => {
  await page.goto('/preview/photos')
  await expect(page.getByTestId('gallery').locator('li')).toHaveCount(3)
  await page.getByRole('button', { name: 'Z boku', exact: true }).click()
  await expect(page.getByTestId('gallery').locator('li')).toHaveCount(1)
  await page.getByRole('button', { name: 'Vše', exact: true }).click()
  await page.getByTestId('compare-toggle').click()
  const items = page.getByTestId('gallery').locator('li button')
  await items.nth(0).click()
  await items.nth(2).click()
  const cmp = page.getByTestId('compare')
  await expect(cmp).toContainText('63 dní mezi fotkami')
  await expect(cmp).toContainText('−2 kg')
  await cmp.getByRole('button', { name: 'Posuvník' }).click()
  await expect(cmp.getByRole('slider')).toBeVisible()
})

test('training templates fit the profile: sport first, equipment shown', async ({ page }) => {
  // preview profile: a runner at home without equipment
  await page.goto('/preview/train')
  const first = page.locator('[data-testid^="template-"]').first()
  await expect(first).toHaveAttribute('data-testid', 'template-runner-strength')
  await expect(first).toContainText('Pro váš sport')
  await expect(page.getByTestId('template-full-body-a')).toContainText(/půjde \d z 5 cviků/)
  await expect(page.getByTestId('template-home-bodyweight')).not.toContainText('půjde')
})

test('the diary opens with a food from a deep link already searched', async ({ page }) => {
  await page.goto('/preview/eat?add=almonds')
  const lunch = page.getByTestId('meal-lunch')
  await expect(lunch.getByRole('textbox').first()).toHaveValue('Mandle')
  await expect(lunch.getByRole('button', { name: /Mandle/ }).first()).toBeVisible()
})

test('today: strong recent pain gets its own tip; reading follows pain, goals and sport', async ({
  page,
}) => {
  // preview person: weight loss then muscle, lower back pain 7/10 yesterday, runs
  await page.goto('/preview/today')
  await expect(page.getByTestId('today-tip')).toContainText('7/10')
  const reading = page.getByTestId('today-reading').getByRole('link')
  await expect(reading).toHaveCount(3)
  await expect(reading.first()).toContainText('Bolest zad')
  // weekly overview from the check-in: this week vs last week
  const week = page.getByTestId('today-week')
  await expect(week.getByTestId('week-sleep')).toContainText('proti minulému týdnu')
  await expect(week.getByTestId('week-steps')).toContainText('+')
})

test('mobility: routines that suit the profile come first and are marked', async ({ page }) => {
  // preview person: desk job, lower back pain, runs
  await page.goto('/preview/mobility')
  const items = page.locator('[data-testid^="routine-"]')
  await expect(items.nth(0)).toHaveAttribute('data-testid', 'routine-desk')
  await expect(items.nth(1)).toHaveAttribute('data-testid', 'routine-runners')
  await expect(items.nth(0)).toContainText('Pro vás')
  await expect(items.nth(2)).not.toContainText('Pro vás')
})

test('supplements: a vegan in winter sees B12 as needed, vitamin D, iodine and omega-3 to consider', async ({
  page,
}) => {
  await page.goto('/preview/supplements')
  const box = page.getByTestId('supp-suggestions')
  await expect(box.getByRole('listitem')).toHaveCount(4)
  await expect(box.getByRole('listitem').first()).toContainText('Nutné')
  await expect(box.getByRole('listitem').first()).toContainText('B12')
  await expect(box.getByRole('link').first()).toHaveAttribute('href', /\/doplnky\/vitamin-b12$/)
})

test('shop in English: headings, labels and the disclosure are English', async ({ page, context }) => {
  await context.addCookies([{ name: 'blwb-locale', value: 'en', url: 'http://localhost:3100' }])
  await page.goto('/preview/store')
  const main = page.locator('main')
  await expect(main).toContainText('How we choose')
  await expect(main).toContainText('Creatine')
  await expect(main).toContainText('Live cultures')
  await expect(page.getByTestId('affiliate-disclosure').first()).toContainText('affiliate links')
  // product names and descriptions come from Czech shops; the page's own words are English
  for (const cs of ['Jak vybíráme', 'Kde koupit', 'Doplněk stravy', 'Živé kultury'])
    await expect(main).not.toContainText(cs)
})

test('food diary in English shows English food and nutrient names', async ({ page, context }) => {
  await context.addCookies([{ name: 'blwb-locale', value: 'en', url: 'http://localhost:3100' }])
  await page.goto('/preview/eat?add=almonds')
  await expect(page.getByTestId('meal-breakfast')).toContainText('Rolled oats')
  const lunch = page.getByTestId('meal-lunch')
  await expect(lunch.getByRole('textbox').first()).toHaveValue('Almonds')
  await expect(lunch.getByRole('button', { name: /Almonds/ }).first()).toBeVisible()
  await expect(page.locator('main')).not.toContainText('Ovesné vločky')
})

test('supplements: each item shows the last 7 days as dots', async ({ page }) => {
  await page.goto('/preview/stack')
  const weeks = page.getByTestId('supp-week')
  await expect(weeks.first()).toHaveAttribute('aria-label', /6 ze 7|6 of 7/)
  await expect(weeks.nth(1)).toHaveAttribute('aria-label', /2 ze 7|2 of 7/)
})
