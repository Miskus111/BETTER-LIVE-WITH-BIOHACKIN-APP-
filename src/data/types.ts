/**
 * Shared domain types for BLWB. All content lives in typed modules under src/data;
 * derived relationships (food → organ, nutrient → food, …) are computed in src/lib/nutrition.ts.
 */

// ── Evidence ────────────────────────────────────────────────────────────────
export type Evidence = 'established' | 'plausible' | 'preliminary'

// ── Nutrients ───────────────────────────────────────────────────────────────
export type NutrientKind =
  'Vitamín' | 'Minerální látka' | 'Mastná kyselina' | 'Bílkoviny a aminokyseliny' | 'Ostatní'
export type Unit = 'g' | 'mg' | 'µg'

export type NutrientId =
  | 'protein'
  | 'eaa'
  | 'fiber'
  | 'vitA'
  | 'vitC'
  | 'vitD'
  | 'vitE'
  | 'vitK'
  | 'b1'
  | 'b6'
  | 'b12'
  | 'folate'
  | 'choline'
  | 'calcium'
  | 'phosphorus'
  | 'magnesium'
  | 'potassium'
  | 'iron'
  | 'zinc'
  | 'iodine'
  | 'omega3'
  | 'ala'
  | 'lutein'
  | 'cultures'
  | 'water'

/** RHP = referenční hodnota příjmu (EU NRV, nař. 1169/2011); AI EFSA = adekvátní příjem dle EFSA */
export type RefKind = 'RHP' | 'AI EFSA' | 'dle tvrzení EU'

export interface Nutrient {
  id: NutrientId
  name: string
  kind: NutrientKind
  unit: Unit
  /** Daily reference value and what it is (EU NRV from Reg. 1169/2011 where one exists). */
  ref?: { value: number; kind: RefKind }
  /**
   * Override for the "source of" threshold per 100 g. Without it the threshold is
   * computed as 15 % of `ref` (EU "source of" rule for vitamins/minerals).
   */
  threshold?: { value: number; basis: string }
  /** Qualitative nutrients (live cultures, essential amino acids, water) are not ranked by amount. */
  qualitative?: { rule: string }
  blurb: string
  /** EU-authorised function statements (Reg. 432/2012), condensed wording. Empty = no authorised claim. */
  functions: string[]
}

// ── Organs ──────────────────────────────────────────────────────────────────
export type SystemId = 'nervous' | 'cardio' | 'digestive' | 'musculoskeletal' | 'urinary' | 'integumentary'

export type OrganId =
  | 'brain'
  | 'eyes'
  | 'heart'
  | 'lungs'
  | 'liver'
  | 'stomach'
  | 'intestines'
  | 'kidneys'
  | 'bones'
  | 'muscles'
  | 'skin'

export interface OrganNutrient {
  id: NutrientId
  role: string
  level: Evidence
  /**
   * 'supports' (default): the organ depends on this nutrient — foods rich in it are linked to the organ.
   * 'handles': the organ absorbs, stores or activates it — shown as physiology, not used to link foods.
   */
  relation?: 'supports' | 'handles'
}

export interface Source {
  title: string
  url: string
}

export type ViewBox = [number, number, number, number]

export interface Organ {
  id: OrganId
  name: string
  shortName: string
  system: SystemId
  accent: string
  tagline: string
  what: string
  how: string
  why: string
  nutrients: OrganNutrient[]
  science: { points: string[]; notShown: string[]; sources: Source[] }
  /** viewBox the anatomy viewer zooms into when the organ is selected */
  zoom: ViewBox
  /** leader-line anchor in body coordinates */
  anchor: [number, number]
  /** body layer the organ belongs to (bones live on the skeleton layer, etc.) */
  layer: 'organs' | 'skeleton' | 'muscles' | 'skin'
  fermentation?: boolean
}

// ── Foods ───────────────────────────────────────────────────────────────────
export type FoodCategory = import('@/lib/foods/categories').Category

export type ArtKind =
  | 'steak'
  | 'liver'
  | 'poultry'
  | 'fish'
  | 'egg'
  | 'bowl'
  | 'bottle'
  | 'jar'
  | 'cheese'
  | 'banana'
  | 'citrus'
  | 'berries'
  | 'leaf'
  | 'carrot'
  | 'potato'
  | 'seeds'
  | 'nut'
  | 'walnut'
  | 'pulses'
  | 'oats'
  | 'oil'

export interface Art {
  kind: ArtKind
  a: string
  b: string
}

export interface Food {
  id: string
  /** Czech name */
  name: string
  nameEn: string
  category: FoodCategory
  subcategory: string | null
  /** raw / cooked / dried … (see src/lib/foods/types.ts) */
  state: string
  /** what the 100 g refers to, in Czech (raw, cooked · roasted, drained …) */
  basis: string
  /** provenance line: "USDA FoodData Central, FDC 171287, SR Legacy 2018-04" */
  fdc: string
  /** kcal per 100 g; 0 only if the dataset has no energy value (never for generated foods) */
  kcal: number
  /** g per 100 g (carbs = total carbohydrate incl. fibre); missing values are 0 here — the full panel shows "no data" */
  macros: { protein: number; fat: number; carbs: number; fiber: number }
  /** the source has no fibre value: shown as „bez údajů“, never as 0 (macros.fiber is 0 only for arithmetic) */
  fiberUnknown?: boolean
  micros: Partial<Record<NutrientId, number>>
  completeProtein?: boolean
  liveCultures?: boolean
  /** a drink: EU 'source of' thresholds are per 100 ml at half the solid level (7.5 % NRV) */
  liquid?: boolean
  sodiumMg?: number
  /** g per 100 g (undefined = no data) */
  sugars?: number
  satFat?: number
  /** default household portion */
  portion: { label: string; grams: number }
  allergens: string[]
  diet: { vegan: boolean; vegetarian: boolean; glutenFree: boolean }
  /** calculated Czech recipe rather than a single dataset record */
  recipe?: boolean
  /** curated everyday food (own illustration and note): listed first by default */
  featured?: boolean
  note?: string
  /** public path; placeholder SVG until licensed photography is supplied */
  image: string
  art: Art
}
