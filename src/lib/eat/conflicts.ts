import type { Food } from '@/data/types'
import { matchesText } from '@/lib/foods/query'

/** Profile allergy answer → the EU allergens (Reg. 1169/2011) that trigger it. */
const ALLERGY_TO_ALLERGENS: Record<string, string[]> = {
  gluten: ['gluten'],
  lactose: ['milk'],
  milk: ['milk'],
  eggs: ['eggs'],
  nuts: ['nuts'],
  peanuts: ['peanuts'],
  soy: ['soy'],
  fish: ['fish'],
  shellfish: ['crustaceans', 'molluscs'],
  sesame: ['sesame'],
}

export interface DietProfile {
  diet: string | null
  allergies: string[]
  dislikes: string[]
}

export type Conflict =
  | { kind: 'allergy'; allergy: string }
  | { kind: 'diet'; diet: 'vegan' | 'vegetarian' | 'pescatarian' }
  | { kind: 'dislike'; word: string }

/**
 * Why this food doesn't fit the person's profile (allergy, diet, a food they don't eat). Only a warning: the
 * diary still lets them log it — the label of the actual product decides.
 */
export function conflictsFor(food: Food, p: DietProfile): Conflict[] {
  const out: Conflict[] = []
  for (const a of p.allergies) {
    if ((ALLERGY_TO_ALLERGENS[a] ?? []).some((x) => food.allergens.includes(x)))
      out.push({ kind: 'allergy', allergy: a })
  }
  if (p.diet === 'vegan' && !food.diet.vegan) out.push({ kind: 'diet', diet: 'vegan' })
  if (p.diet === 'vegetarian' && !food.diet.vegetarian) out.push({ kind: 'diet', diet: 'vegetarian' })
  // pescatarian: fish and seafood are fine, other meat isn't
  if (
    p.diet === 'pescatarian' &&
    !food.diet.vegetarian &&
    !food.allergens.some((x) => ['fish', 'crustaceans', 'molluscs'].includes(x))
  )
    out.push({ kind: 'diet', diet: 'pescatarian' })
  for (const w of p.dislikes.map((d) => d.trim()).filter((d) => d.length >= 3))
    if (matchesText(food, w)) out.push({ kind: 'dislike', word: w })
  return out
}
