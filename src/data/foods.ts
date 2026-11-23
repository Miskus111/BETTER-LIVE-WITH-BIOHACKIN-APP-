import { CATEGORIES, CATEGORY_ART, categorySlug, type Category } from '@/lib/foods/categories'
import type { LiteFood } from '@/lib/foods/lite'
import liteData from './foods.lite.generated.json'
import { FOOD_NOTES } from './food-notes'
import type { Food } from './types'

/**
 * All foods, generated from USDA FoodData Central by `npm run foods:build` (see scripts/foods and
 * docs/data-sources.md). This module is client-safe: it holds the compact index (macros + the nutrients
 * used by organs and NRV logic). The full 50-nutrient panel, portions and provenance live in
 * src/data/food-details.ts (server only).
 */
export const FOOD_CATEGORIES: Category[] = [...CATEGORIES]

function toFood(l: LiteFood): Food {
  const curated = FOOD_NOTES[l.id]
  const cat = l.category as Category
  return {
    id: l.id,
    name: l.name,
    nameEn: l.nameEn,
    category: cat,
    subcategory: l.subcategory,
    state: l.state,
    basis: l.basis,
    fdc: l.source,
    kcal: l.kcal ?? 0,
    macros: { protein: l.protein ?? 0, fat: l.fat ?? 0, carbs: l.carbs ?? 0, fiber: l.fiber ?? 0 },
    ...(l.fiber == null ? { fiberUnknown: true } : {}),
    micros: l.micros,
    completeProtein: l.completeProtein,
    liveCultures: l.liveCultures,
    liquid: l.liquid,
    sodiumMg: l.sodiumMg ?? undefined,
    sugars: l.sugars ?? undefined,
    satFat: l.satFat ?? undefined,
    portion: l.portion,
    allergens: l.allergens,
    diet: { vegan: l.vegan, vegetarian: l.vegetarian, glutenFree: l.glutenFree },
    recipe: l.recipe,
    featured: !!curated,
    note: curated?.note,
    image: curated ? `/images/foods/${l.id}.svg` : `/images/foods/cat-${categorySlug(cat)}.svg`,
    art: curated?.art ?? CATEGORY_ART[cat],
  }
}

export const FOODS: Food[] = (liteData as LiteFood[]).map(toFood)

export const FOOD_BY_ID = Object.fromEntries(FOODS.map((x) => [x.id, x])) as Record<string, Food>

/**
 * Renamed food ids → current id. Old ids live on in diary entries and links; next.config.ts redirects
 * the old /food/ URLs. Never reuse an old id for a different food.
 */
export const FOOD_ID_ALIASES: Record<string, string> = {
  'seaweed-nori': 'spirulina', // the record is spirulina, not nori
  'yeast-nutritional': 'yeast-dry', // the record is dry baker's yeast, not nutritional yeast
  'olomouc-cheese': 'limburger',
  halloumi: 'goat-cheese-hard', // the record is hard goat cheese, not halloumi
  'cod-liver-canned': 'cod-canned', // canned cod, not cod liver
  'parsley-root': 'parsley', // parsley leaves, not root
  'rice-basmati-cooked': 'rice-parboiled-cooked', // parboiled rice, not basmati
  'coffee-latte': 'coffee-decaf', // decaf coffee, not latte
  'banana-chips': 'banana-dried', // dehydrated banana, not fried chips // the record is limburger; tvarůžky are nearly fat-free, nothing alike
}

export const foodById = (id: string): Food | undefined => FOOD_BY_ID[id] ?? FOOD_BY_ID[FOOD_ID_ALIASES[id]]
