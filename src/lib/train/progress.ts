import { pragueDay } from '@/lib/dates'
/**
 * Training progress over time: weekly volume and per-exercise estimated 1RM.
 * Pure functions; the history/progress pages feed them rows from workout_sets.
 */
import { estimate1RM, round } from './strength'

export interface ProgressSet {
  workoutId: string
  exercise: string // slug
  date: string // ISO timestamp of the set (or its workout)
  reps: number
  weightKg: number
  type: 'warmup' | 'normal' | 'drop' | 'failure'
}

export interface WeekPoint {
  week: string // Monday, YYYY-MM-DD
  volume: number // kg × reps of working sets
  workouts: number
  sets: number
}

export interface ExercisePoint {
  date: string // YYYY-MM-DD
  e1rm: number
  weightKg: number // the set that produced the best e1RM
  reps: number
}

const DAY = 864e5

/** Monday of the (Czech-time) week containing `d`, as YYYY-MM-DD. */
export function weekStart(d: Date): string {
  const day0 = new Date(`${pragueDay(d)}T00:00:00Z`)
  const dow = (day0.getUTCDay() + 6) % 7 // Monday = 0
  return new Date(day0.getTime() - dow * DAY).toISOString().slice(0, 10)
}

const working = (s: ProgressSet) => s.type !== 'warmup' && s.reps > 0

/** The last `weeks` weeks ending with the current one, oldest first; empty weeks are kept as zeros. */
export function weeklyVolume(sets: ProgressSet[], weeks = 12, now = new Date()): WeekPoint[] {
  const current = new Date(`${weekStart(now)}T00:00:00Z`).getTime()
  const out: WeekPoint[] = []
  const index = new Map<string, { p: WeekPoint; ids: Set<string> }>()
  for (let i = weeks - 1; i >= 0; i--) {
    const week = new Date(current - i * 7 * DAY).toISOString().slice(0, 10)
    const p = { week, volume: 0, workouts: 0, sets: 0 }
    out.push(p)
    index.set(week, { p, ids: new Set() })
  }
  for (const s of sets) {
    const slot = index.get(weekStart(new Date(s.date)))
    if (!slot) continue
    slot.ids.add(s.workoutId)
    if (!working(s)) continue
    slot.p.volume += s.reps * s.weightKg
    slot.p.sets += 1
  }
  for (const { p, ids } of index.values()) {
    p.workouts = ids.size
    p.volume = Math.round(p.volume)
  }
  return out
}

/** Best estimated 1RM per training day for each exercise, oldest first. Bodyweight-only sets are skipped. */
export function exerciseProgress(sets: ProgressSet[]): Map<string, ExercisePoint[]> {
  const best = new Map<string, Map<string, ExercisePoint>>()
  for (const s of sets) {
    if (!working(s) || s.weightKg <= 0) continue
    const date = s.date.length > 10 ? pragueDay(new Date(s.date)) : s.date
    const e1rm = estimate1RM(s.weightKg, s.reps).value
    const days = best.get(s.exercise) ?? new Map<string, ExercisePoint>()
    const cur = days.get(date)
    if (!cur || e1rm > cur.e1rm) days.set(date, { date, e1rm, weightKg: s.weightKg, reps: s.reps })
    best.set(s.exercise, days)
  }
  const out = new Map<string, ExercisePoint[]>()
  for (const [slug, days] of best)
    out.set(
      slug,
      [...days.values()].sort((a, b) => a.date.localeCompare(b.date)),
    )
  return out
}

/** Percent change between the first and last point, or null with fewer than two points. */
export function change(points: { value: number }[]): number | null {
  if (points.length < 2 || points[0].value <= 0) return null
  return round(((points[points.length - 1].value - points[0].value) / points[0].value) * 100, 0)
}

/** Round axis bounds and evenly spaced ticks (1, 2, 2.5 or 5 × 10ⁿ) around the data. */
export function niceAxis(values: number[], minRel = 0.03): { lo: number; hi: number; ticks: number[] } {
  if (!values.length) return { lo: 0, hi: 10, ticks: [0, 5, 10] }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const raw = Math.max((max - min) / 4, max * minRel, minRel < 0.03 ? 0.5 : 1)
  const pow = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((x) => x >= raw) ?? 10 * pow
  const lo = Math.max(0, Math.floor((min - step * 0.5) / step) * step)
  const hi = Math.ceil((max + step * 0.5) / step) * step
  const ticks: number[] = []
  for (let v = lo; v <= hi + 1e-9; v += step) ticks.push(Math.round(v * 100) / 100)
  return { lo, hi, ticks }
}
