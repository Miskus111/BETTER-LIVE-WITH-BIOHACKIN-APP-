import { describe, expect, it } from 'vitest'
import { weekCompare, weekOverview } from './week'

describe('weekCompare', () => {
  it('averages the last 7 days against the 7 before, ignoring empty days', () => {
    const rows = [
      { date: '2026-11-23', value: 8000 },
      { date: '2026-11-20', value: 6000 },
      { date: '2026-11-18', value: null },
      { date: '2026-11-15', value: 4000 },
      { date: '2026-11-10', value: 5000 },
      { date: '2026-11-01', value: 99999 }, // older than two weeks: ignored
    ]
    expect(weekCompare(rows, '2026-11-23')).toEqual({ now: 7000, before: 4500, days: 2 })
  })
})

describe('weekOverview', () => {
  it('returns only what the person logs this week, in useful units', () => {
    const r = weekOverview(
      [
        { night_of: '2026-11-22', duration_min: 420 },
        { night_of: '2026-11-14', duration_min: 360 },
      ],
      [{ logged_on: '2026-11-23', steps: 9000, water_ml: 2000, resting_hr: null }],
      '2026-11-23',
    )
    expect(r.map((m) => m.key)).toEqual(['sleep', 'steps', 'water'])
    expect(r[0]).toEqual({ key: 'sleep', now: 7, before: 6, days: 1 })
    expect(r[2]).toEqual({ key: 'water', now: 2, before: null, days: 1 })
  })
})
