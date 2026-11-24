import { FOODS } from '@/data/foods'
import { NUTRIENTS } from '@/data/nutrients'
import type { Food, NutrientId, Organ } from '@/data/types'
import {
  amountOf,
  isSource,
  linkVia,
  onePerFood,
  organScore,
  rankable,
  scaled,
  type Basis,
} from '@/lib/nutrition'

/**
 * Rankings over the whole food list. Kept apart from lib/nutrition so components that only need its helpers
 * don't pull all foods into the browser; client components use the precomputed lists in @/data/food-picks.
 */
export function foodsForOrgan(
  organ: Organ,
  k = 12,
  per: Basis = '100g',
): { food: Food; via: NutrientId[] }[] {
  const ranked = FOODS.filter((food) => rankable(food, per))
    .map((food) => ({ food, via: linkVia(food, organ) }))
    .filter((x) => x.via.length > 0)
    .sort((a, b) => organScore(b.food, organ, per) - organScore(a.food, organ, per))
  return onePerFood(ranked).slice(0, k)
}

/** Best sources of a nutrient; `v` is per 100 g or per the default portion depending on `per`. */
export function topFoodsFor(id: NutrientId, k = 5, per: Basis = '100g'): { food: Food; v: number }[] {
  const qualitative = !!NUTRIENTS[id].qualitative
  const ranked = FOODS.filter((f) => isSource(f, id) && rankable(f, per))
    .map((food) => ({ food, v: scaled(food, amountOf(food, id)!, per) }))
    .sort((a, b) => (qualitative ? 0 : b.v - a.v))
  return onePerFood(ranked).slice(0, k)
}
