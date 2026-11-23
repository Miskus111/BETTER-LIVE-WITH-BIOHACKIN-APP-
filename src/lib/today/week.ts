/** One metric's average this week and last week (7 days each, ending today). */
export interface WeekMetric {
  key: 'sleep' | 'steps' | 'water' | 'restingHr'
  /** null when there is no entry in that week */
  now: number | null
  before: number | null
  /** entries this week (an average of one day says little) */
  days: number
}

type Row = { date: string; value: number | null }

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

/** Days are ISO dates (YYYY-MM-DD); `today` is the last day of "this week". */
export function weekCompare(
  rows: Row[],
  today: string,
): { now: number | null; before: number | null; days: number } {
  const t = Date.parse(today + 'T00:00:00Z')
  const age = (d: string) => Math.round((t - Date.parse(d + 'T00:00:00Z')) / 864e5)
  const valid = rows.filter((r) => r.value !== null && Number.isFinite(r.value)) as {
    date: string
    value: number
  }[]
  const thisWeek = valid.filter((r) => age(r.date) >= 0 && age(r.date) <= 6).map((r) => r.value)
  const lastWeek = valid.filter((r) => age(r.date) >= 7 && age(r.date) <= 13).map((r) => r.value)
  return { now: avg(thisWeek), before: avg(lastWeek), days: thisWeek.length }
}

/**
 * The week in numbers from the daily check-in: sleep (from sleep_logs, in hours), steps, water and resting heart
 * rate (from recovery_logs). Only metrics the person actually logs this week are returned.
 */
export function weekOverview(
  sleep: { night_of: string; duration_min: number | null }[],
  recovery: { logged_on: string; steps: number | null; water_ml: number | null; resting_hr: number | null }[],
  today: string,
): WeekMetric[] {
  const out: WeekMetric[] = []
  const add = (key: WeekMetric['key'], rows: Row[]) => {
    const r = weekCompare(rows, today)
    if (r.days > 0) out.push({ key, ...r })
  }
  // sleep of the night before each day belongs to that day's week
  add(
    'sleep',
    sleep.map((s) => ({ date: s.night_of, value: s.duration_min === null ? null : s.duration_min / 60 })),
  )
  add(
    'steps',
    recovery.map((r) => ({ date: r.logged_on, value: r.steps })),
  )
  add(
    'water',
    recovery.map((r) => ({ date: r.logged_on, value: r.water_ml === null ? null : r.water_ml / 1000 })),
  )
  add(
    'restingHr',
    recovery.map((r) => ({ date: r.logged_on, value: r.resting_hr })),
  )
  return out
}
