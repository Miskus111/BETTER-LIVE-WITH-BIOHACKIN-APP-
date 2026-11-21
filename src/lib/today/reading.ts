import { BODY_GUIDE_BY_SLUG, type BodyGuide } from '@/data/body-guides'

/** Which website guide explains each onboarding answer best. */
const BY_PAIN: Record<string, string> = {
  neck: 'bolest-krku',
  shoulder: 'bolest-krku',
  upper_back: 'bolest-zad',
  lower_back: 'bolest-zad',
  hip: 'pohyb-a-sezeni',
  knee: 'bolest-kolen',
  wrist_elbow: 'protahovani',
}
const BY_GOAL: Record<string, string> = {
  fat_loss: 'hubnuti-a-energie',
  muscle: 'bilkoviny',
  performance: 'spanek',
  health: 'pohyb-a-sezeni',
  longevity: 'dlouhovekost',
  pain_relief: 'bolest-zad',
  appearance: 'akne-a-plet',
}
const BY_SPORT: Record<string, string> = {
  gym: 'svalova-horecka',
  crossfit: 'svalova-horecka',
  running: 'pitny-rezim',
  cycling: 'pitny-rezim',
  hiking: 'pitny-rezim',
  swimming: 'dychani',
  yoga: 'protahovani',
  climbing: 'protahovani',
}
const FALLBACK = ['spanek', 'stres', 'bilkoviny']

export interface ReadingInput {
  /** in the user's priority order */
  goals: string[]
  painAreas: string[]
  sports: string[]
}

/**
 * Up to `k` guides for this person: their pain first (the most practical help), then their goals in the order
 * they ranked them, then their sport, topped up with sleep, stress and protein. No duplicates.
 */
export function readingFor({ goals, painAreas, sports }: ReadingInput, k = 3): BodyGuide[] {
  const slugs = [
    ...painAreas.map((p) => BY_PAIN[p]),
    ...goals.map((g) => BY_GOAL[g]),
    ...sports.map((s) => BY_SPORT[s]),
    ...FALLBACK,
  ].filter((s): s is string => !!s && !!BODY_GUIDE_BY_SLUG[s])
  return [...new Set(slugs)].slice(0, k).map((s) => BODY_GUIDE_BY_SLUG[s])
}

export const READING_SLUGS = [
  ...Object.values(BY_PAIN),
  ...Object.values(BY_GOAL),
  ...Object.values(BY_SPORT),
  ...FALLBACK,
]

/** Same estimate as the guide page on the website (200 words a minute), so both show the same number. */
export function readingMinutes(g: BodyGuide) {
  const text = [
    g.hook,
    ...g.tldr,
    ...g.numbers.map((n) => n.label),
    ...g.how.flatMap((h) => [h.title, h.text]),
    ...g.today,
    ...g.helps.map((h) => h.text),
    ...g.myths.flatMap((m) => [m.myth, m.fact]),
  ].join(' ')
  return Math.max(1, Math.ceil(text.split(/\s+/).length / 200))
}
