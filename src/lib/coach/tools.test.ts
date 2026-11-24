import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
const { runCoachTool } = await import('./tools')

/** Minimal Supabase stand-in: any chain of query methods resolves to the table's rows. */
function fakeDb(tables: Record<string, unknown[]>) {
  return {
    from(table: string) {
      const rows = tables[table] ?? []
      const builder: Record<string, unknown> = {
        then: (ok: (v: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(ok),
        maybeSingle: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
        single: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
      }
      for (const m of ['select', 'eq', 'gte', 'lte', 'order', 'limit', 'in', 'is']) builder[m] = () => builder
      return builder
    },
  }
}

const today = new Date().toISOString().slice(0, 10)

describe('coach tools', () => {
  it('never sends the free-text medication list to the model, only interaction categories', async () => {
    const db = fakeDb({
      profiles: [{ birth_date: '1990-01-01', sex: 'male', height_cm: 180, weight_kg: 80 }],
      goals: [{ goal: 'health' }],
      preferences: [{ training_days: 3, medications: 'Warfarin 5 mg, Euthyrox 50 — tajná poznámka' }],
    })
    const out = await runCoachTool(db, 'u1', 'get_profile', {})
    expect(out).not.toMatch(/Warfarin|Euthyrox|tajná/)
    expect(JSON.parse(out).medication_interaction_categories.length).toBeGreaterThan(0)
  })
  it('adds up the food diary per day', async () => {
    const db = fakeDb({
      food_logs: [
        { logged_on: today, kcal: 300, protein_g: 20, carbs_g: 30, fat_g: 10, fiber_g: 4 },
        { logged_on: today, kcal: 200.4, protein_g: 10, carbs_g: 20, fat_g: 5, fiber_g: 2 },
      ],
    })
    const out = JSON.parse(await runCoachTool(db, 'u1', 'get_nutrition', { days: 7 }))
    expect(out.daily).toEqual([{ date: today, kcal: 500, protein_g: 30, carbs_g: 50, fat_g: 15, fiber_g: 6 }])
  })
})

describe('coach look-back windows use Prague calendar days', () => {
  /** Records every .gte(column, value) the tool sends. */
  function recordingDb(calls: [string, string, unknown][]) {
    return {
      from(table: string) {
        const builder: Record<string, unknown> = {
          then: (ok: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(ok),
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        }
        for (const m of ['select', 'eq', 'lte', 'order', 'limit', 'in', 'is']) builder[m] = () => builder
        builder.gte = (col: string, v: unknown) => {
          calls.push([table, col, v])
          return builder
        }
        return builder
      },
    }
  }
  it('just after midnight in Prague (still the day before in UTC) counts from the Prague day', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-23T23:30:00Z')) // 00:30 on 24 Nov in Prague
    try {
      const calls: [string, string, unknown][] = []
      await runCoachTool(recordingDb(calls), 'u1', 'get_nutrition', { days: 7 })
      await runCoachTool(recordingDb(calls), 'u1', 'get_pain_and_recovery', {})
      // 7 days including today (24 Nov) start on 18 Nov; a UTC count would have started on 17 Nov
      expect(calls).toContainEqual(['food_logs', 'logged_on', '2026-11-18'])
      expect(calls).toContainEqual(['sleep_logs', 'night_of', '2026-11-10'])
    } finally {
      vi.useRealTimers()
    }
  })
})
