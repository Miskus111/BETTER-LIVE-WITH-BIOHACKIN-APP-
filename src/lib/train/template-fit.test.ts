import { describe, expect, it } from 'vitest'
import { TEMPLATES } from '@/data/exercises/templates'
import { EXERCISE_BY_SLUG } from '@/data/exercises'
import { availableEquipment, canDo, rankTemplates } from './template-fit'

describe('template fit', () => {
  it('every template exercise exists in the library', () => {
    for (const t of TEMPLATES)
      for (const s of t.exercises) expect(EXERCISE_BY_SLUG[s], `${t.id}: ${s}`).toBeTruthy()
  })
  it('alternatives count, a bench never decides', () => {
    const dumbbells = availableEquipment(['dumbbells'])
    expect(canDo('romanian-deadlift', dumbbells)).toBe(true) // barbell or dumbbell
    expect(canDo('incline-dumbbell-press', dumbbells)).toBe(true) // dumbbell + bench
    expect(canDo('barbell-bench-press', dumbbells)).toBe(false)
    expect(canDo('copenhagen-plank', availableEquipment([]))).toBe(true)
  })
  it('home without equipment: the bodyweight template first, the barbell ones last', () => {
    const r = rankTemplates(TEMPLATES, { equipment: ['none'], sports: [] })
    expect(r[0]).toMatchObject({ id: 'home-bodyweight', doable: 6, total: 6 })
    expect(r.at(-1)!.doable! / r.at(-1)!.total).toBeLessThan(0.5)
  })
  it('a runner sees the runners template first; no equipment answer keeps the order', () => {
    expect(rankTemplates(TEMPLATES, { equipment: ['full_gym'], sports: ['running'] })[0].id).toBe(
      'runner-strength',
    )
    const plain = rankTemplates(TEMPLATES, { equipment: [], sports: [] })
    expect(plain.map((f) => f.id)).toEqual(TEMPLATES.map((t) => t.id))
    expect(plain.every((f) => f.doable === null)).toBe(true)
  })
})
