import { EXERCISE_BY_SLUG } from '@/data/exercises'
import { EQUIPMENT_KINDS, type Equipment } from '@/data/exercises/types'
import type { Template } from '@/data/exercises/templates'

/** Onboarding equipment answer → equipment kinds in the exercise library. Bodyweight is always available. */
const FROM_PROFILE: Record<string, Equipment[]> = {
  none: [],
  dumbbells: ['dumbbell'],
  barbell: ['barbell', 'ez_bar'],
  kettlebell: ['kettlebell'],
  bands: ['band'],
  pullup_bar: ['pullup_bar'],
  machines: ['machine', 'cable', 'smith'],
  cardio: ['cardio_machine'],
  full_gym: [...EQUIPMENT_KINDS],
}

/** Templates made for a sport. */
const FOR_SPORT: Record<string, string> = { running: 'runner-strength', martial_arts: 'fighter-conditioning' }

export const availableEquipment = (profile: string[]) =>
  new Set<Equipment>(['bodyweight', ...profile.flatMap((p) => FROM_PROFILE[p] ?? [])])

/**
 * An exercise lists alternatives ("barbell or dumbbell"); a bench comes on top of the weights and a chair can
 * stand in for it, so it never decides on its own.
 */
export function canDo(slug: string, have: Set<Equipment>) {
  const e = EXERCISE_BY_SLUG[slug]
  if (!e) return false
  const needs = e.equipment.filter((x) => x !== 'bench')
  return needs.length === 0 || needs.some((x) => have.has(x))
}

export interface TemplateFit {
  id: string
  /** exercises this person can do with their equipment (null: equipment not filled in) */
  doable: number | null
  total: number
  forSport: boolean
}

/**
 * Templates in the order that suits this person: made for their sport first, then the ones they can do
 * completely with their equipment, then the rest. Without an equipment answer the order stays as authored.
 */
export function rankTemplates(
  templates: Template[],
  { equipment, sports }: { equipment: string[]; sports: string[] },
): TemplateFit[] {
  const have = equipment.length ? availableEquipment(equipment) : null
  const sportIds = new Set(sports.map((s) => FOR_SPORT[s]).filter(Boolean))
  return templates
    .map((t, i) => ({
      i,
      fit: {
        id: t.id,
        doable: have ? t.exercises.filter((s) => canDo(s, have)).length : null,
        total: t.exercises.length,
        forSport: sportIds.has(t.id),
      },
    }))
    .sort((a, b) => {
      const share = (f: TemplateFit) => (f.doable === null ? 1 : f.doable / f.total)
      return Number(b.fit.forSport) - Number(a.fit.forSport) || share(b.fit) - share(a.fit) || a.i - b.i
    })
    .map((x) => x.fit)
}
