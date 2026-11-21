import { describe, expect, it } from 'vitest'
import { FOOD_BY_ID } from '@/data/foods'
import { conflictsFor, type DietProfile } from './conflicts'

const none: DietProfile = { diet: null, allergies: [], dislikes: [] }
const kinds = (id: string, p: Partial<DietProfile>) =>
  conflictsFor(FOOD_BY_ID[id], { ...none, ...p }).map((c) =>
    c.kind === 'allergy' ? c.allergy : c.kind === 'diet' ? c.diet : c.word,
  )

describe('conflictsFor', () => {
  it('flags allergies through the EU allergen list', () => {
    expect(kinds('almonds', { allergies: ['nuts'] })).toEqual(['nuts'])
    expect(kinds('yogurt', { allergies: ['lactose'] })).toEqual(['lactose'])
    expect(kinds('almonds', { allergies: ['gluten'] })).toEqual([])
  })
  it('respects vegan, vegetarian and pescatarian diets', () => {
    expect(kinds('honey', { diet: 'vegan' })).toEqual(['vegan'])
    expect(kinds('beef', { diet: 'vegetarian' })).toEqual(['vegetarian'])
    expect(kinds('salmon', { diet: 'pescatarian' })).toEqual([])
    expect(kinds('beef', { diet: 'pescatarian' })).toEqual(['pescatarian'])
    expect(kinds('lentils', { diet: 'vegan' })).toEqual([])
  })
  it('matches foods the user said they do not eat, ignoring diacritics and too-short words', () => {
    expect(kinds('spinach', { dislikes: ['spenat'] })).toEqual(['spenat'])
    expect(kinds('spinach', { dislikes: ['sp'] })).toEqual([])
  })
})
