import type { Food } from '@/data/types'

/**
 * Everyday words people type that the food names don't contain ("vajíčko" → Vejce, "špagety" → Těstoviny).
 * Written without diacritics — search compares normalised text.
 */
const RULES: { match: (f: Food) => boolean; words: string }[] = [
  { match: (f) => f.category === 'Vejce', words: 'vajicko vajicka vajicek vajco' },
  { match: (f) => f.category === 'Ryby a mořské plody', words: 'ryba ryby' },
  { match: (f) => /těstovin/i.test(f.name), words: 'spagety spaghetti makarony penne nudle' },
  { match: (f) => /krůt/i.test(f.name), words: 'krocan kruta' },
  { match: (f) => f.id === 'energy-drink', words: 'energetak energetik' },
  { match: (f) => f.id === 'whey-protein', words: 'syrovatka' },
  { match: (f) => f.id === 'bread-white', words: 'toustovy toust' },
  { match: (f) => f.id === 'peach', words: 'broskve broskvi' },
  { match: (f) => f.id === 'grapefruit', words: 'grep grepy' },
  { match: (f) => /sój/i.test(f.name), words: 'soja soji' },
  { match: (f) => f.id === 'limburger', words: 'olomoucke tvaruzky syrecky' },
  { match: (f) => f.id === 'cream', words: 'slehacka slehacky' },
  { match: (f) => f.id === 'kohlrabi', words: 'kedlubna kedlubny' },
  { match: (f) => f.id === 'gnocchi', words: 'noky' },
  { match: (f) => f.id === 'pork-ribs-cooked', words: 'zebirka' },
]

const cache = new WeakMap<Food, string>()

/** Extra search words for a food ('' when none). */
export function foodAliases(food: Food): string {
  let words = cache.get(food)
  if (words === undefined) {
    words = RULES.filter((r) => r.match(food))
      .map((r) => r.words)
      .join(' ')
    cache.set(food, words)
  }
  return words
}
