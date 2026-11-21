import Link from '@/components/ui/Link'
import { getLocale, getTranslations } from 'next-intl/server'
import { requireAppUser } from '@/lib/auth'
import { EXERCISE_BY_SLUG } from '@/data/exercises'
import { setsPerMuscle, volume, type LoggedSet } from '@/lib/train/strength'
import { MuscleSetsChart } from '@/components/train/MuscleSetsChart'
import { isoDaysAgo } from '@/lib/dates'

type Db = { from: (t: string) => any } // eslint-disable-line @typescript-eslint/no-explicit-any

export default async function HistoryPage() {
  const { supabase } = await requireAppUser()
  const db = supabase as unknown as Db
  const t = await getTranslations('train')
  const locale = (await getLocale()) as 'cs' | 'en'
  const weekAgo = isoDaysAgo(7)

  const [{ data: workouts }, { data: sets }, { data: prs }, { data: sports }, { data: ex }] =
    await Promise.all([
      db
        .from('workouts')
        .select('id, name, started_at, finished_at')
        .order('started_at', { ascending: false })
        .limit(30),
      db
        .from('workout_sets')
        .select('workout_id, exercise_id, reps, weight_kg, set_type, created_at')
        .gte('created_at', weekAgo),
      db.from('personal_records').select('exercise_id, kind, value, achieved_at'),
      db
        .from('sport_sessions')
        .select('id, sport, started_at, duration_min, distance_km, rpe')
        .order('started_at', { ascending: false })
        .limit(20),
      db.from('exercises').select('id, slug').is('owner_id', null),
    ])
  const slugById: Record<string, string> = Object.fromEntries(
    (ex ?? []).map((r: { id: string; slug: string }) => [r.id, r.slug]),
  )
  const name = (id: string) => EXERCISE_BY_SLUG[slugById[id]]?.name[locale] ?? '—'

  const logged: LoggedSet[] = (sets ?? []).map(
    (s: { exercise_id: string; reps: number; weight_kg: number; set_type: LoggedSet['type'] }) => ({
      exercise: slugById[s.exercise_id],
      reps: s.reps ?? 0,
      weightKg: Number(s.weight_kg ?? 0),
      type: s.set_type,
      completed: true,
    }),
  )
  const perMuscle = setsPerMuscle(logged, (slug) => {
    const e = EXERCISE_BY_SLUG[slug]
    return e && { primary: e.primary, secondary: e.secondary }
  })
  const prByExercise = new Map<string, Record<string, number>>()
  for (const p of prs ?? []) {
    const cur = prByExercise.get(p.exercise_id) ?? {}
    cur[p.kind] = Number(p.value)
    prByExercise.set(p.exercise_id, cur)
  }
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString(locale === 'cs' ? 'cs-CZ' : 'en-GB', { day: 'numeric', month: 'short' })

  return (
    <div className="space-y-10">
      <h1 className="display text-[44px]">{t('history')}</h1>

      <section>
        <h2 className="eyebrow mb-3">
          {t('thisWeek')} · {t('setsPerMuscle')} · {t('volume')} {volume(logged)} kg
        </h2>
        {Object.keys(perMuscle).length ? (
          <MuscleSetsChart data={perMuscle} />
        ) : (
          <p className="text-muted">{t('noHistory')}</p>
        )}
      </section>

      <section>
        <ul className="divide-line border-line divide-y rounded-2xl border">
          {(workouts ?? []).length === 0 && <li className="text-muted p-4">{t('noHistory')}</li>}
          {(workouts ?? []).map(
            (w: { id: string; name: string; started_at: string; finished_at: string | null }) => (
              <li key={w.id} className="flex items-center justify-between gap-3 p-4">
                <span className="font-medium">{w.name}</span>
                <span className="text-subtle font-mono text-[13px]">
                  {fmt(w.started_at)}
                  {w.finished_at &&
                    ` · ${Math.round((+new Date(w.finished_at) - +new Date(w.started_at)) / 60000)} min`}
                </span>
              </li>
            ),
          )}
        </ul>
      </section>

      <section id="prs" className="scroll-mt-20">
        <h2 className="eyebrow mb-3">{t('prs')}</h2>
        {prByExercise.size === 0 ? (
          <p className="text-muted">{t('noHistory')}</p>
        ) : (
          <div className="border-line overflow-x-auto rounded-2xl border">
            <table className="w-full min-w-[480px] text-left text-[14px]">
              <thead className="text-subtle bg-white/[0.03] font-mono text-[12px]">
                <tr>
                  <th className="px-4 py-2.5 font-normal">&nbsp;</th>
                  <th className="px-4 py-2.5 font-normal">{t('e1rm')}</th>
                  <th className="px-4 py-2.5 font-normal">{t('maxWeight')}</th>
                  <th className="px-4 py-2.5 font-normal">{t('maxReps')}</th>
                </tr>
              </thead>
              <tbody className="divide-line divide-y">
                {[...prByExercise].map(([id, r]) => (
                  <tr key={id}>
                    <td className="px-4 py-2.5">
                      <Link href={`/train/exercises/${slugById[id]}`} className="hover:text-cyan">
                        {name(id)}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 font-mono">{r.e1rm ?? '—'} kg</td>
                    <td className="px-4 py-2.5 font-mono">{r.max_weight ?? '—'} kg</td>
                    <td className="px-4 py-2.5 font-mono">{r.max_reps ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {(sports ?? []).length > 0 && (
        <section>
          <h2 className="eyebrow mb-3">{t('sport')}</h2>
          <ul className="divide-line border-line divide-y rounded-2xl border">
            {(sports ?? []).map(
              (s: {
                id: string
                sport: string
                started_at: string
                duration_min: number
                distance_km: number | null
              }) => (
                <li key={s.id} className="flex justify-between gap-3 p-4">
                  <span>{s.sport}</span>
                  <span className="text-subtle font-mono text-[13px]">
                    {fmt(s.started_at)} · {s.duration_min} min{s.distance_km ? ` · ${s.distance_km} km` : ''}
                  </span>
                </li>
              ),
            )}
          </ul>
        </section>
      )}
    </div>
  )
}
