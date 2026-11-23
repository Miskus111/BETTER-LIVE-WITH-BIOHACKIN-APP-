import { describe, expect, it } from 'vitest'
import { lastSevenDays, pragueDate } from './adherence'

describe('supplement history', () => {
  it('uses the Prague calendar day', () => {
    expect(pragueDate(new Date('2026-11-22T23:30:00Z'))).toBe('2026-11-23') // 00:30 in Prague
  })
  it('marks the days each supplement was taken, oldest first, today last', () => {
    const now = new Date('2026-11-23T12:00:00Z')
    const r = lastSevenDays(
      [
        { user_supplement_id: 'a', taken_at: '2026-11-23T07:00:00Z' },
        { user_supplement_id: 'a', taken_at: '2026-11-21T07:00:00Z' },
        { user_supplement_id: 'a', taken_at: '2026-11-21T19:00:00Z' }, // twice a day counts once
        { user_supplement_id: 'a', taken_at: '2026-11-10T07:00:00Z' }, // too old
        { user_supplement_id: 'b', taken_at: '2026-11-17T07:00:00Z' },
      ],
      ['a', 'b', 'c'],
      now,
    )
    expect(r.a).toEqual([false, false, false, false, true, false, true])
    expect(r.b).toEqual([true, false, false, false, false, false, false])
    expect(r.c.every((x) => !x)).toBe(true)
  })
})
