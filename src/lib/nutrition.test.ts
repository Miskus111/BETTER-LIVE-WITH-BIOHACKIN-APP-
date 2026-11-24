import { describe, expect, it } from 'vitest'
import { ORGAN_BY_ID } from '@/data/organs'
import { foodsForOrgan, topFoodsFor } from './food-rankings'

describe('rankings per 100 g', () => {
  it('leave out foods eaten by the pinch (spices, dried herbs)', () => {
    const ids = topFoodsFor('calcium', 10).map((x) => x.food.id)
    expect(ids).not.toContain('marjoram')
    expect(ids).not.toContain('oregano')
    expect(foodsForOrgan(ORGAN_BY_ID.bones, 12).map((x) => x.food.id)).not.toContain('marjoram')
  })
  it('still rank them per portion on their real amounts', () => {
    expect(topFoodsFor('calcium', 10, 'portion').length).toBe(10)
  })
})

describe('rankings show each food once', () => {
  it('keep only the best preparation of a food', async () => {
    const { baseName } = await import('./foods/variants')
    const names = foodsForOrgan(ORGAN_BY_ID.brain, 12, 'portion').map(
      (x) => `${x.food.category}|${baseName(x.food.name)}`,
    )
    expect(new Set(names).size).toBe(names.length)
  })
})

describe('what rankings recommend', () => {
  it('never suggests alcohol, sugary or energy drinks or sweets', async () => {
    const { ORGANS } = await import('@/data/organs')
    const bad = new Set([
      'energy-drink',
      'cola',
      'beer',
      'spirits',
      'wine-red',
      'nutella',
      'cookies',
      'gummy',
    ])
    for (const o of ORGANS)
      for (const per of ['100g', 'portion'] as const)
        expect(foodsForOrgan(o, 12, per).filter((x) => bad.has(x.food.id))).toEqual([])
    expect(topFoodsFor('b12', 20, 'portion').map((x) => x.food.id)).not.toContain('energy-drink')
  })
  it('per portion, a teaspoon of spice does not outrank real foods', () => {
    const ids = foodsForOrgan(ORGAN_BY_ID.lungs, 12, 'portion').map((x) => x.food.id)
    expect(ids).not.toContain('paprika-spice')
  })
})
