import { describe, expect, it } from 'vitest'
import { dayBefore, pragueDay } from './dates'

describe('pragueDay', () => {
  it('is already the next day in Prague shortly after midnight', () => {
    expect(pragueDay(new Date('2026-11-22T23:30:00Z'))).toBe('2026-11-23') // winter, UTC+1
    expect(pragueDay(new Date('2026-07-14T22:30:00Z'))).toBe('2026-07-15') // summer, UTC+2
    expect(pragueDay(new Date('2026-11-23T12:00:00Z'))).toBe('2026-11-23')
  })
  it('dayBefore counts calendar days', () => {
    expect(dayBefore('2026-11-23', 1)).toBe('2026-11-22')
    expect(dayBefore('2026-03-01', 1)).toBe('2026-02-28')
  })
})
