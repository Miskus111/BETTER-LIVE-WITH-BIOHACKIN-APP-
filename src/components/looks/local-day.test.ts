import { describe, expect, it } from 'vitest'
import { localDay } from './LooksHabits'

describe('localDay', () => {
  it('uses the local calendar day, not UTC', () => {
    // 00:30 local time on 23 Nov is still 22 Nov in UTC for any zone east of Greenwich
    const d = new Date(2026, 10, 23, 0, 30)
    expect(localDay(d)).toBe('2026-11-23')
  })
})
