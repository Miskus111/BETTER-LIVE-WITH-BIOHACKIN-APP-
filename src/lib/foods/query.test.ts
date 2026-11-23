import { describe, expect, it } from 'vitest'
import { FOODS, FOOD_BY_ID } from '@/data/foods'
import { EMPTY_QUERY, matchesText, measureOf, portionText, queryFoods } from './query'
import { rawCookedPair } from './variants'
import { notRecommendedReason } from '@/lib/nutrition'

describe('food queries', () => {
  it('search ignores Czech diacritics and matches English names', () => {
    expect(matchesText(FOOD_BY_ID.lentils, 'cocka')).toBe(true)
    expect(matchesText(FOOD_BY_ID.lentils, 'lentils')).toBe(true)
    expect(matchesText(FOOD_BY_ID.lentils, 'losos')).toBe(false)
  })
  it('filters by diet and excluded allergen', () => {
    const vegan = queryFoods(FOODS, { ...EMPTY_QUERY, diet: 'vegan' })
    expect(vegan.length).toBeGreaterThan(100)
    expect(vegan.some((f) => f.allergens.includes('milk') || f.category === 'Maso')).toBe(false)
    const noGluten = queryFoods(FOODS, { ...EMPTY_QUERY, without: 'gluten' })
    expect(noGluten.some((f) => f.allergens.includes('gluten'))).toBe(false)
  })
  it('sorts by a nutrient per 100 g and per portion, "no data" last', () => {
    const per100 = queryFoods(FOODS, { ...EMPTY_QUERY, sort: 'vitC' })
    // sorted within each group: real foods first, then spices and foods we never recommend
    const isLast = (f: (typeof per100)[number]) => f.portion.grams < 10 || !!notRecommendedReason(f)
    for (const group of [per100.filter((f) => !isLast(f)), per100.filter(isLast)]) {
      const vals = group.map((f) => measureOf(f, 'vitC') ?? -1)
      expect(vals).toEqual([...vals].sort((a, b) => b - a))
    }
    const protein100 = queryFoods(FOODS, { ...EMPTY_QUERY, sort: 'protein' })
    const proteinPortion = queryFoods(FOODS, { ...EMPTY_QUERY, sort: 'protein', per: 'portion' })
    // dried powders lead per 100 g; a real meal portion leads per portion
    expect(proteinPortion[0].id).not.toBe(protein100[0].id)
    const p = proteinPortion[0]
    expect(((measureOf(p, 'protein') ?? 0) * p.portion.grams) / 100).toBeGreaterThan(20)
  })
  it('"high in" uses the EU source-of threshold', () => {
    const iron = queryFoods(FOODS, { ...EMPTY_QUERY, highIn: 'iron' })
    expect(iron.every((f) => (f.micros.iron ?? 0) >= 14 * 0.15 * (f.liquid ? 0.5 : 1))).toBe(true)
  })
})

describe('portionText', () => {
  it('adds grams only when the label does not state a weight', () => {
    expect(portionText({ label: 'porce 125 g', grams: 125 })).toBe('porce 125 g')
    expect(portionText({ label: '1 sklenice (250 ml)', grams: 258 })).toBe('1 sklenice (250 ml)')
    expect(portionText({ label: '1 lžíce', grams: 12 })).toBe('1 lžíce (12 g)')
    expect(portionText({ label: '1 vejce L', grams: 60 })).toBe('1 vejce L (60 g)')
  })
})

describe('sorting per 100 g', () => {
  it('puts foods eaten by the pinch after real foods', () => {
    const top = queryFoods(FOODS, { ...EMPTY_QUERY, sort: 'calcium' })
      .slice(0, 5)
      .map((f) => f.id)
    expect(top).not.toContain('marjoram')
    const herbs = queryFoods(FOODS, { ...EMPTY_QUERY, sort: 'calcium', category: 'Bylinky a koření' })
    expect(herbs.map((f) => f.id)).toContain('marjoram') // still listed, just not on top
  })
})

describe('rawCookedPair', () => {
  it('pairs raw/dry with cooked forms from either page', () => {
    const s = rawCookedPair(FOOD_BY_ID['spinach'], FOODS)
    expect([s?.before.id, s?.after.id]).toEqual(['spinach', 'spinach-cooked'])
    expect(rawCookedPair(FOOD_BY_ID['spinach-cooked'], FOODS)?.before.id).toBe('spinach')
    expect(rawCookedPair(FOOD_BY_ID['lentils-dry'], FOODS)?.after.id).toBe('lentils')
  })
})

describe('sorting by a nutrient', () => {
  it('puts foods we never recommend after real foods (still listed)', () => {
    const b6 = queryFoods(FOODS, { ...EMPTY_QUERY, sort: 'b6', per: 'portion' }).map((f) => f.id)
    expect(b6.slice(0, 10)).not.toContain('energy-drink')
    expect(b6).toContain('energy-drink')
  })
})

describe('food text search and Czech word endings', () => {
  const names = (q: string) => FOODS.filter((f) => matchesText(f, q)).map((f) => f.name)
  it('finds a food by another form of its name', () => {
    expect(names('jablka')).toContain('Jablko')
    expect(names('knedlíky')).toContain('Houskový knedlík')
    expect(names('palačinka')).toContain('Palačinky (bez náplně)')
  })
  it('does not widen short words', () => {
    expect(names('čaj').every((n) => n.toLowerCase().includes('čaj'))).toBe(true)
  })
})
