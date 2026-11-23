import { describe, expect, it } from 'vitest'
import { diaryWeek } from './week'

describe('diaryWeek', () => {
  it('averages logged days of the past week, leaving out today and empty days', () => {
    const r = diaryWeek(
      [
        { logged_on: '2026-11-23', kcal: 500, protein_g: 20 }, // today: left out
        { logged_on: '2026-11-22', kcal: 1200, protein_g: 60 },
        { logged_on: '2026-11-22', kcal: 800, protein_g: 40 }, // same day adds up
        { logged_on: '2026-11-20', kcal: '1800', protein_g: '90' }, // numerics from the database come as strings
        { logged_on: '2026-11-10', kcal: 9999, protein_g: 999 }, // too old
      ],
      '2026-11-23',
    )
    expect(r).toEqual({ days: 2, kcal: 1900, protein: 95 })
  })
  it('null when nothing was logged', () => {
    expect(diaryWeek([{ logged_on: '2026-11-23', kcal: 500, protein_g: 20 }], '2026-11-23')).toBeNull()
  })
})
