/** One remembered food: its id and the amount last logged. */
export interface RecentFood {
  id: string
  grams: number
}

/**
 * Foods logged most often over the past week, for one-tap logging. Entries from the same meal count three times
 * (oatmeal comes up at breakfast, soup at lunch); ties go to the most recent. Titles are `name|food id`; entries
 * without a known id (typed by hand) are skipped. The amount is the one used last time.
 */
export function recentFoods(
  rows: { logged_on: string; meal: string; title: string; grams: number | string }[],
  meal: string,
  known: (id: string) => boolean,
  limit = 6,
): RecentFood[] {
  const byId = new Map<string, { score: number; last: string; grams: number }>()
  for (const r of rows) {
    const id = r.title.split('|')[1]
    const grams = Number(r.grams)
    if (!id || !known(id) || !(grams > 0)) continue
    const e = byId.get(id) ?? { score: 0, last: '', grams }
    e.score += r.meal === meal ? 3 : 1
    if (r.logged_on >= e.last) {
      e.last = r.logged_on
      e.grams = grams
    }
    byId.set(id, e)
  }
  return [...byId.entries()]
    .sort(([, a], [, b]) => b.score - a.score || b.last.localeCompare(a.last))
    .slice(0, limit)
    .map(([id, e]) => ({ id, grams: e.grams }))
}
