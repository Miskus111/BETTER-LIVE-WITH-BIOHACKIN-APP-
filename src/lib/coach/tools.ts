import 'server-only'
import { trendChange, weeklyRate, withTrend } from '@/lib/body/weight'
import type Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { profileTargets } from '@/lib/eat/profile-targets'
import { ageFrom } from '@/lib/eat/targets'
import { checkStack, medicationCategories, type Condition } from '@/lib/supplements/safety'
import { SUPPLEMENT_BY_ID, type SupplementId } from '@/data/supplement-library'
import { MARKER_BY_KEY } from '@/lib/labs/markers'
import { dayBefore, pragueDay } from '@/lib/dates'

type Db = { from: (t: string) => any } // eslint-disable-line @typescript-eslint/no-explicit-any

const days = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}
/** The calendar day n days before today in Prague — date columns (logged_on, night_of) hold Prague days. */
const dayAgo = (n: number) => dayBefore(pragueDay(new Date()), n)

/** Read-only tools over the signed-in user's own rows (RLS applies — the client is the user's). */
export const COACH_TOOLS: Anthropic.Beta.BetaTool[] = [
  {
    name: 'get_profile',
    description:
      "The user's profile (age, sex, height, weight, experience), goals, training preferences, equipment, diet type, allergies, pain areas, sleep and the medication interaction categories, plus calculated daily calorie and macro targets. Call this first when advice depends on who the user is.",
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_training',
    description:
      'Strength workouts (exercise, sets as weight×reps, RPE) and sport sessions over the last N days, newest first.',
    input_schema: {
      type: 'object',
      properties: {
        days: { type: 'integer', minimum: 1, maximum: 56, description: 'look-back window, default 14' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_nutrition',
    description:
      'Daily food-diary totals (kcal, protein, carbs, fat, fibre) for the last N days, compared with targets.',
    input_schema: {
      type: 'object',
      properties: { days: { type: 'integer', minimum: 1, maximum: 14, description: 'default 7' } },
      additionalProperties: false,
    },
  },
  {
    name: 'get_supplements',
    description:
      "The user's active supplement stack with daily doses, and any safety issues found (EFSA upper limits, medication interactions, timing).",
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_labs',
    description:
      'Confirmed lab values: the latest value of every marker with its flag and reference range, or the full history of one marker.',
    input_schema: {
      type: 'object',
      properties: {
        marker: {
          type: 'string',
          description: `optional marker key, one of: ${Object.keys(MARKER_BY_KEY).join(', ')}`,
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_body',
    description:
      'Body weight trend (7-day average, 30-day change, weekly rate), tape measurements (waist, hips, chest, arm, thigh) and InBody-style body-composition scans, newest first.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_pain_and_recovery',
    description:
      'Recent pain reports (region, 0–10 score, red flags) and sleep/recovery logs (sleep, HRV, resting HR, stress, steps).',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
]

const Days = z.object({ days: z.number().int().min(1).max(56).optional() })
const Labs = z.object({ marker: z.string().max(40).optional() })

export async function runCoachTool(
  db: Db,
  userId: string,
  name: string,
  rawInput: unknown,
  ctx: { conditions?: Condition[] } = {},
): Promise<string> {
  switch (name) {
    case 'get_profile': {
      const [{ data: p }, { data: goals }, { data: prefs }] = await Promise.all([
        db
          .from('profiles')
          .select('birth_date, sex, height_cm, weight_kg, experience')
          .eq('id', userId)
          .maybeSingle(),
        db.from('goals').select('goal').order('priority'),
        db
          .from('preferences')
          .select(
            'sports, training_days, session_minutes, equipment, diet_type, allergies, dislikes, pain_areas, medications, sleep_hours, work_pattern',
          )
          .maybeSingle(),
      ])
      const g = (goals ?? []).map((x: { goal: string }) => x.goal)
      const t = profileTargets(p, prefs, g)
      const { medications, ...rest } = prefs ?? {}
      return JSON.stringify({
        age: p?.birth_date ? ageFrom(p.birth_date) : null,
        sex: p?.sex,
        height_cm: p?.height_cm,
        weight_kg: p?.weight_kg,
        experience: p?.experience,
        goals: g,
        preferences: rest,
        // the free-text medication list is never sent to the model, only interaction categories
        medication_interaction_categories: medicationCategories(medications),
        targets: t.status === 'ok' ? t.targets : null,
        targets_status: t.status,
      })
    }
    case 'get_training': {
      const n = Days.parse(rawInput ?? {}).days ?? 14
      const since = days(n).toISOString()
      const [{ data: w }, { data: sport }] = await Promise.all([
        db
          .from('workouts')
          .select(
            'name, started_at, finished_at, workout_sets(position, set_index, set_type, reps, weight_kg, rpe, exercises(name_en))',
          )
          .gte('started_at', since)
          .order('started_at', { ascending: false })
          .limit(40),
        db
          .from('sport_sessions')
          .select('sport, started_at, duration_min, distance_km, avg_hr, rpe')
          .gte('started_at', since)
          .order('started_at', { ascending: false })
          .limit(40),
      ])
      type S = {
        position: number
        set_index: number
        set_type: string
        reps: number | null
        weight_kg: number | null
        rpe: number | null
        exercises: { name_en: string } | null
      }
      const workouts = (w ?? []).map(
        (x: { name: string; started_at: string; finished_at: string | null; workout_sets: S[] }) => {
          const by = new Map<string, string[]>()
          for (const s of [...x.workout_sets].sort(
            (a, b) => a.position - b.position || a.set_index - b.set_index,
          )) {
            const k = s.exercises?.name_en ?? '?'
            by.set(k, [
              ...(by.get(k) ?? []),
              `${s.weight_kg ?? 0}×${s.reps ?? 0}${s.rpe ? `@${s.rpe}` : ''}${s.set_type !== 'normal' ? ` (${s.set_type})` : ''}`,
            ])
          }
          return {
            date: x.started_at.slice(0, 10),
            name: x.name,
            minutes: x.finished_at
              ? Math.round((+new Date(x.finished_at) - +new Date(x.started_at)) / 60000)
              : null,
            exercises: [...by].map(([exercise, sets]) => ({ exercise, sets: sets.join(', ') })),
          }
        },
      )
      return JSON.stringify({ days: n, workouts, sport_sessions: sport ?? [] })
    }
    case 'get_nutrition': {
      const n = Math.min(14, Days.parse(rawInput ?? {}).days ?? 7)
      const { data } = await db
        .from('food_logs')
        .select('logged_on, kcal, protein_g, carbs_g, fat_g, fiber_g')
        .gte('logged_on', dayAgo(n - 1))
      const totals = new Map<string, Record<string, number>>()
      for (const r of data ?? []) {
        const t = totals.get(r.logged_on) ?? { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 }
        for (const k of Object.keys(t)) t[k] += Number(r[k] ?? 0)
        totals.set(r.logged_on, t)
      }
      const daily = [...totals].sort().map(([date, t]) => ({
        date,
        ...Object.fromEntries(Object.entries(t).map(([k, v]) => [k, Math.round(v)])),
      }))
      return JSON.stringify({ days: n, logged_days: daily.length, daily })
    }
    case 'get_supplements': {
      const [{ data: stack }, { data: prefs }] = await Promise.all([
        db.from('user_supplements').select('dose_amount, timing, supplements(slug)').eq('active', true),
        db.from('preferences').select('medications').maybeSingle(),
      ])
      const items = (stack ?? []).map(
        (r: { dose_amount: number | null; timing: string | null; supplements: { slug: string } | null }) => ({
          id: (r.supplements?.slug ?? '') as SupplementId,
          dailyAmount: Number(r.dose_amount ?? 0),
          timing: r.timing,
        }),
      )
      const issues = checkStack(items, {
        medications: prefs?.medications ?? null,
        conditions: ctx.conditions,
      })
      return JSON.stringify({
        stack: items.map((i: { id: SupplementId; dailyAmount: number; timing: string | null }) => ({
          supplement: SUPPLEMENT_BY_ID[i.id]?.name.en ?? i.id,
          daily: `${i.dailyAmount} ${SUPPLEMENT_BY_ID[i.id]?.dose.unit ?? ''}`,
          timing: i.timing,
        })),
        issues: issues.map((x) => ({
          supplement: x.supplement,
          level: x.level,
          code: x.code,
          detail: x.detail.en,
        })),
      })
    }
    case 'get_labs': {
      const { marker } = Labs.parse(rawInput ?? {})
      let q = db
        .from('lab_values')
        .select('marker, value, unit, flag, ref_low, ref_high, taken_on')
        .eq('confirmed', true)
        .order('taken_on', { ascending: false })
      if (marker) q = q.eq('marker', marker)
      const { data } = await q.limit(marker ? 50 : 300)
      if (marker) return JSON.stringify({ marker, history: data ?? [] })
      const latest = new Map<string, unknown>()
      for (const r of data ?? []) if (!latest.has(r.marker)) latest.set(r.marker, r)
      return JSON.stringify({ latest: [...latest.values()] })
    }
    case 'get_body': {
      const [{ data }, { data: tape }] = await Promise.all([
        db
          .from('body_composition')
          .select('measured_on, weight_kg, skeletal_muscle_kg, body_fat_pct, visceral_fat_level')
          .eq('confirmed', true)
          .order('measured_on', { ascending: false })
          .limit(12),
        db
          .from('body_measurements')
          .select('measured_at, weight_kg, waist_cm, hips_cm, chest_cm, arm_cm, thigh_cm')
          .order('measured_at', { ascending: false })
          .limit(60),
      ])
      const weights = withTrend(
        (tape ?? [])
          .filter((r: { weight_kg: number | null }) => r.weight_kg !== null)
          .map((r: { measured_at: string; weight_kg: number }) => ({
            date: r.measured_at,
            weightKg: Number(r.weight_kg),
          })),
      )
      return JSON.stringify({
        body_composition_scans: data ?? [],
        weight_trend_7d_avg: weights.slice(-1)[0]?.trend ?? null,
        weight_change_30d_kg: trendChange(weights, 30),
        weight_rate_kg_per_week: weeklyRate(weights, 28),
        recent_measurements: (tape ?? []).slice(0, 20),
      })
    }
    case 'get_pain_and_recovery': {
      const [{ data: pain }, { data: sleep }, { data: rec }] = await Promise.all([
        db
          .from('pain_reports')
          .select('region, score, red_flags, reported_at')
          .order('reported_at', { ascending: false })
          .limit(10),
        db
          .from('sleep_logs')
          .select('night_of, duration_min, quality')
          .gte('night_of', dayAgo(14))
          .order('night_of', { ascending: false }),
        db
          .from('recovery_logs')
          .select('logged_on, hrv_ms, resting_hr, stress, steps')
          .gte('logged_on', dayAgo(14))
          .order('logged_on', { ascending: false }),
      ])
      return JSON.stringify({ pain_reports: pain ?? [], sleep: sleep ?? [], recovery: rec ?? [] })
    }
    default:
      throw new Error(`unknown tool ${name}`)
  }
}
