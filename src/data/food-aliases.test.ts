import { describe, expect, it } from 'vitest'
import { FOOD_BY_ID, FOOD_ID_ALIASES, foodById } from './foods'

describe('renamed food ids', () => {
  it('old ids still resolve (diary entries keep them)', () => {
    expect(foodById('seaweed-nori')?.id).toBe('spirulina')
    expect(foodById('yeast-nutritional')?.id).toBe('yeast-dry')
  })
  it('aliases point to existing foods and never shadow a current id', () => {
    for (const [oldId, id] of Object.entries(FOOD_ID_ALIASES)) {
      expect(FOOD_BY_ID[id]).toBeDefined()
      expect(FOOD_BY_ID[oldId]).toBeUndefined()
    }
  })
})

describe('unknown fibre is not zero', () => {
  it('milk and dishes with milk are marked fiberUnknown; foods with a value are not', async () => {
    const { FOOD_BY_ID } = await import('./foods')
    expect(FOOD_BY_ID['milk'].fiberUnknown).toBe(true)
    expect(FOOD_BY_ID['houskovy-knedlik'].fiberUnknown).toBe(true)
    expect(FOOD_BY_ID['lentils'].fiberUnknown).toBeUndefined()
    expect(FOOD_BY_ID['egg'].fiberUnknown).toBeUndefined() // a real 0
  })
})
