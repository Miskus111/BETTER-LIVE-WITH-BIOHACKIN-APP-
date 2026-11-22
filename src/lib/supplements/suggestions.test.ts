import { describe, expect, it } from 'vitest'
import { SUPPLEMENTS } from '@/data/supplement-library'
import { profileSuggestions } from './suggestions'

const ids = (p: Partial<Parameters<typeof profileSuggestions>[0]>) =>
  profileSuggestions({ diet: null, allergies: [], month: 6, stack: [], ...p }).map(
    (s) => `${s.id}:${s.strength}`,
  )

describe('profileSuggestions', () => {
  it('a vegan needs B12 and should consider iodine and omega-3; vitamin D only in winter', () => {
    expect(ids({ diet: 'vegan' })).toEqual(['vitamin-b12:needed', 'iodine:consider', 'omega-3:consider'])
    expect(ids({ diet: 'vegan', month: 11 })).toContain('vitamin-d3:consider')
  })
  it('an omnivore in summer gets nothing; fish allergy points to omega-3', () => {
    expect(ids({ diet: 'omnivore' })).toEqual([])
    expect(ids({ allergies: ['fish'] })).toEqual(['omega-3:consider'])
  })
  it('leaves out what is already in the stack and only names supplements from the library', () => {
    expect(ids({ diet: 'vegan', stack: ['vitamin-b12'] })).not.toContain('vitamin-b12:needed')
    const lib = new Set(SUPPLEMENTS.map((s) => s.id))
    for (const s of profileSuggestions({ diet: 'vegan', allergies: ['fish'], month: 1, stack: [] }))
      expect(lib.has(s.id), s.id).toBe(true)
  })
})
