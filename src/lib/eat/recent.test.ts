import { describe, expect, it } from 'vitest'
import { recentFoods } from './recent'

const row = (logged_on: string, meal: string, id: string, grams = 100) => ({
  logged_on,
  meal,
  title: `Name|${id}`,
  grams,
})
const known = (id: string) => id !== 'gone'

describe('recent foods for one-tap logging', () => {
  it('ranks foods from the same meal first and remembers the last amount', () => {
    const rows = [
      row('2026-11-20', 'lunch', 'soup', 300),
      row('2026-11-20', 'breakfast', 'oats', 60),
      row('2026-11-21', 'breakfast', 'oats', 80),
      row('2026-11-22', 'lunch', 'oats', 50),
      row('2026-11-22', 'snack', 'apple', 150),
    ]
    expect(recentFoods(rows, 'breakfast', known)).toEqual([
      { id: 'oats', grams: 50 },
      { id: 'apple', grams: 150 },
      { id: 'soup', grams: 300 },
    ])
    expect(recentFoods(rows, 'lunch', known)[0].id).toBe('oats')
  })
  it('skips hand-typed entries, unknown foods and zero amounts', () => {
    const rows = [
      { logged_on: '2026-11-22', meal: 'lunch', title: 'Babiččin guláš', grams: 300 },
      row('2026-11-22', 'lunch', 'gone'),
      row('2026-11-22', 'lunch', 'rice', 0),
    ]
    expect(recentFoods(rows, 'lunch', known)).toEqual([])
  })
  it('keeps at most the limit', () => {
    const rows = ['a', 'b', 'c', 'd'].map((id) => row('2026-11-22', 'lunch', id))
    expect(recentFoods(rows, 'lunch', known, 2)).toHaveLength(2)
  })
})
