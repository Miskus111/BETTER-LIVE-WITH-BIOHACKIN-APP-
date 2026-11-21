import Link from '@/components/ui/Link'
import { getLocale, getTranslations } from 'next-intl/server'
import { ArrowLeft, Trophy } from 'lucide-react'
import { requireAppUser } from '@/lib/auth'
import { gate } from '@/lib/plan'
import { Paywall } from '@/components/app/Paywall'
import { EXERCISE_BY_SLUG } from '@/data/exercises'
import { exerciseProgress, weeklyVolume, type ProgressSet } from '@/lib/train/progress'
import { ProgressCharts, Stat, type ExerciseSeries } from '@/components/train/ProgressCharts'
import { isoDaysAgo } from '@/lib/dates'

type Db = { from: (t: string) => any } // eslint-disable-line @typescript-eslint/no-explicit-any

export async function generateMetadata() {
  const t = await getTranslations('progress')
  return { title: t('title') }
}

const WEEKS = 12

export default async function ProgressPage() {
  const { supabase, user } = await requireAppUser()
  const db = supabase as unknown as Db
  const t = await getTranslations('progress')
  const access = await gate(supabase, user.id, 'progress')
  if (!access.allowed)
    return (
      <div className="space-y-8">
        <h1 className="display text-[44px] md:text-[56px]">{t('title')}</h1>
        <Paywall feature="progress" />
      </div>
    )
  const locale = (await getLocale()) as 'cs' | 'en'
  const since = isoDaysAgo(26 * 7)

  const [{ data: rows }, { data: ex }] = await Promise.all([
    db
      .from('workout_sets')
      .select('workout_id, exercise_id, reps, weight_kg, set_type, created_at, workouts(started_at)')
      .gte('created_at', since)
      .eq('completed', true)
      .limit(10000),
    db.from('exercises').select('id, slug'),
  ])
  const slugById: Record<string, string> = Object.fromEntries(
    (ex ?? []).map((r: { id: string; slug: string }) => [r.id, r.slug]),
  )
  const sets: ProgressSet[] = (rows ?? []).map(
    (r: {
      workout_id: string
      exercise_id: string
      reps: number | null
      weight_kg: number | null
      set_type: ProgressSet['type']
      created_at: string
      workouts: { started_at: string } | null
    }) => ({
      workoutId: r.workout_id,
      exercise: slugById[r.exercise_id] ?? r.exercise_id,
      // the workout's start date groups sets synced later with the right day
      date: r.workouts?.started_at ?? r.created_at,
      reps: r.reps ?? 0,
      weightKg: Number(r.weight_kg ?? 0),
      type: r.set_type,
    }),
  )

  const weeks = weeklyVolume(sets, WEEKS)
  const exercises: ExerciseSeries[] = [...exerciseProgress(sets)]
    .map(([slug, points]) => ({ slug, points, name: EXERCISE_BY_SLUG[slug]?.name[locale] ?? slug }))
    .sort((a, b) => b.points.length - a.points.length || a.name.localeCompare(b.name, locale))

  // last 4 weeks vs the 4 before
  const sum = (from: number, to: number, k: 'volume' | 'workouts') =>
    weeks.slice(from, to).reduce((a, w) => a + w[k], 0)
  const vol4 = sum(WEEKS - 4, WEEKS, 'volume')
  const volPrev = sum(WEEKS - 8, WEEKS - 4, 'volume')
  const wk4 = sum(WEEKS - 4, WEEKS, 'workouts')
  const volChange = volPrev > 0 ? Math.round(((vol4 - volPrev) / volPrev) * 100) : null
  const nf = new Intl.NumberFormat(locale === 'en' ? 'en' : 'cs-CZ')

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/train"
          className="text-subtle hover:text-fg inline-flex items-center gap-1.5 text-[14px]"
        >
          <ArrowLeft size={15} aria-hidden /> {t('back')}
        </Link>
        <h1 className="display mt-2 text-[44px] md:text-[56px]">{t('title')}</h1>
        <p className="text-muted mt-2 max-w-2xl text-[15px]">{t('intro')}</p>
      </div>

      <dl className="grid grid-cols-3 gap-2 sm:gap-3 md:max-w-2xl" aria-label={t('last4')}>
        <Stat label={t('workouts4')} value={`${wk4}`} />
        <Stat label={t('perWeek')} value={nf.format(Math.round((wk4 / 4) * 10) / 10)} />
        <Stat
          label={volChange === null ? t('volume4') : t('volumeVsPrev')}
          value={
            volChange === null
              ? `${nf.format(Math.round(vol4 / 100) / 10)} t`
              : `${volChange > 0 ? '+' : ''}${volChange} %`
          }
          tone={volChange === null ? undefined : volChange >= 0 ? 'up' : 'down'}
        />
      </dl>

      <ProgressCharts weeks={weeks} exercises={exercises} />

      <Link
        href="/train/history#prs"
        className="card hover:border-cyan/40 flex items-center gap-3 p-4 text-[15px] transition"
      >
        <Trophy size={19} className="text-cyan" aria-hidden /> {t('toRecords')}
      </Link>
    </div>
  )
}
