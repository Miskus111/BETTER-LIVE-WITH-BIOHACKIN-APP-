import { describe, expect, it } from 'vitest'
import { FOODS } from '@/data/foods'
import { matchesText } from './query'

describe('everyday food words', () => {
  const names = (q: string) => FOODS.filter((f) => matchesText(f, q)).map((f) => f.name)
  it.each([
    ['vajíčko', 'Vejce (celé)'],
    ['ryba', 'Losos (chovaný)'],
    ['špagety', 'Těstoviny vařené'],
    ['krocan', 'Krůtí prsa'],
    ['energeťák', 'Energetický nápoj'],
    ['syrovátka', 'Syrovátkový protein (izolát)'],
  ])('"%s" finds %s in the food list', (q, name) => {
    expect(names(q)).toContain(name)
  })
})
