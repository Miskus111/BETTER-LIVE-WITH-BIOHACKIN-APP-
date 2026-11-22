import type { SupplementId } from '@/data/supplement-library'

export type SuggestionStrength = 'needed' | 'consider'
export interface Suggestion {
  id: SupplementId
  strength: SuggestionStrength
  /** message key in the `supp` namespace explaining why */
  reason: 'whyB12Vegan' | 'whyB12Vegetarian' | 'whyIodineVegan' | 'whyOmega3NoFish' | 'whyVitDWinter'
  /** website guide (/doplnky/<slug>) */
  guide: string
}

/**
 * Supplements this person's profile points to — only well-established cases, never a cure or a dose:
 * vitamin B12 is the one nutrient a vegan diet cannot supply; at Central European latitudes the skin makes
 * almost no vitamin D from October to March; iodine and long-chain omega-3 are mostly missing without iodised
 * salt, dairy and fish. Anything already in the user's stack is left out.
 */
export function profileSuggestions({
  diet,
  allergies,
  month,
  stack,
}: {
  diet: string | null
  allergies: string[]
  /** 1–12 */
  month: number
  stack: string[]
}): Suggestion[] {
  const out: Suggestion[] = []
  if (diet === 'vegan')
    out.push({ id: 'vitamin-b12', strength: 'needed', reason: 'whyB12Vegan', guide: 'vitamin-b12' })
  if (diet === 'vegetarian')
    out.push({ id: 'vitamin-b12', strength: 'consider', reason: 'whyB12Vegetarian', guide: 'vitamin-b12' })
  if (month >= 10 || month <= 3)
    out.push({ id: 'vitamin-d3', strength: 'consider', reason: 'whyVitDWinter', guide: 'vitamin-d' })
  if (diet === 'vegan')
    out.push({ id: 'iodine', strength: 'consider', reason: 'whyIodineVegan', guide: 'jod' })
  if (diet === 'vegan' || diet === 'vegetarian' || allergies.includes('fish'))
    out.push({ id: 'omega-3', strength: 'consider', reason: 'whyOmega3NoFish', guide: 'omega-3' })
  return out.filter((s) => !stack.includes(s.id))
}
