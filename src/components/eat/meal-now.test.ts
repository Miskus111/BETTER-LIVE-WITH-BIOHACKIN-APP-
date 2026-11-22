import { describe, expect, it } from 'vitest'
import { mealNow } from './FoodDiary'

describe('mealNow (Prague time)', () => {
  it('picks the meal by the hour in Prague, whatever the server clock', () => {
    // 21 Nov 2026: Prague is UTC+1
    expect(mealNow(new Date('2026-11-21T06:30:00Z'))).toBe('breakfast') // 7:30
    expect(mealNow(new Date('2026-11-21T11:00:00Z'))).toBe('lunch') // 12:00
    expect(mealNow(new Date('2026-11-21T14:30:00Z'))).toBe('snack') // 15:30
    expect(mealNow(new Date('2026-11-21T17:30:00Z'))).toBe('dinner') // 18:30
    expect(mealNow(new Date('2026-11-21T21:30:00Z'))).toBe('snack') // 22:30
  })
})
