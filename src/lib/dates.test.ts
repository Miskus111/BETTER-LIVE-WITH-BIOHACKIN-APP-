import { describe, expect, it } from 'vitest'
import { dayBefore, pragueDay, pragueMidnight, pragueMonday } from './dates'

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

describe('pragueMidnight and pragueMonday', () => {
  it('midnight in Prague as a UTC instant, winter and summer', () => {
    expect(pragueMidnight('2026-11-23').toISOString()).toBe('2026-11-22T23:00:00.000Z')
    expect(pragueMidnight('2026-07-15').toISOString()).toBe('2026-07-14T22:00:00.000Z')
    // days when the clocks change (29 March and 25 October 2026): midnight is still before the switch
    expect(pragueMidnight('2026-03-29').toISOString()).toBe('2026-03-28T23:00:00.000Z')
    expect(pragueMidnight('2026-10-25').toISOString()).toBe('2026-10-24T22:00:00.000Z')
  })
  it('Monday of the week', () => {
    expect(pragueMonday('2026-11-23')).toBe('2026-11-23') // a Monday
    expect(pragueMonday('2026-11-29')).toBe('2026-11-23') // Sunday
    expect(pragueMonday('2026-11-24')).toBe('2026-11-23')
  })
})
