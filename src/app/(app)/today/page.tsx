import Link from '@/components/ui/Link'
import { getTranslations } from 'next-intl/server'
import { Activity, Apple, Bed, Bot, Dumbbell, FlaskConical, Gauge, Pill, Scale } from 'lucide-react'
import { requireAppUser } from '@/lib/auth'
import { profileTargets } from '@/lib/eat/profile-targets'
import { CheckIn } from '@/components/today/CheckIn'
import { cx } from '@/lib/format'
import { trendChange, withTrend } from '@/lib/body/weight'
import { readingFor, readingMinutes } from '@/lib/today/reading'

type Db = { from: (t: string) => any } // eslint-disable-line @typescript-eslint/no-explicit-any
const iso = (d: Date) => d.toISOString().slice(0, 10)

export default async function TodayPage() {
  const { profile, supabase, user } = await requireAppUser()
  const db = supabase as unknown as Db
  const t = await getTranslations('today')
  const nav = await getTranslations('nav')
  const mob = await getTranslations('mob')

  const now = new Date()
  const today = iso(now)
  const yesterday = iso(new Date(now.getTime() - 864e5))
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  weekStart.setHours(0, 0, 0, 0)
  const dayStart = new Date(now)
  dayStart.setHours(0, 0, 0, 0)

  const [w, food, stack, taken, pain, sleep, rec, labs, goals, prefs, bw] = await Promise.all([
    db
      .from('workouts')
      .select('name, started_at')
      .gte('started_at', weekStart.toISOString())
      .order('started_at', { ascending: false }),
    db.from('food_logs').select('kcal, protein_g').eq('logged_on', today),
    db.from('user_supplements').select('id').eq('active', true),
    db.from('supplement_logs').select('user_supplement_id').gte('taken_at', dayStart.toISOString()),
    db
      .from('pain_reports')
      .select('region, score, reported_at')
      .order('reported_at', { ascending: false })
      .limit(1),
    db.from('sleep_logs').select('duration_min, quality').eq('night_of', yesterday).maybeSingle(),
    db
      .from('recovery_logs')
      .select('steps, water_ml, hrv_ms, resting_hr, stress')
      .eq('logged_on', today)
      .maybeSingle(),
    db
      .from('lab_values')
      .select('marker, flag, taken_on')
      .eq('confirmed', true)
      .order('taken_on', { ascending: false })
      .limit(200),
    db.from('goals').select('goal').order('priority'),
    db
      .from('preferences')
      .select('training_days, work_pattern, sports, pain_areas')
      .eq('user_id', user.id)
      .maybeSingle(),
    db
      .from('body_measurements')
      .select('measured_at, weight_kg')
      .not('weight_kg', 'is', null)
      .gte('measured_at', iso(new Date(now.getTime() - 60 * 864e5)))
      .order('measured_at'),
  ])

  const workouts = (w.data ?? []) as { name: string; started_at: string }[]
  const kcal = Math.round((food.data ?? []).reduce((a: number, r: { kcal: number }) => a + Number(r.kcal), 0))
  const protein = Math.round(
    (food.data ?? []).reduce((a: number, r: { protein_g: number }) => a + Number(r.protein_g), 0),
  )
  const target = profileTargets(
    profile,
    prefs.data,
    (goals.data ?? []).map((g: { goal: string }) => g.goal),
  )
  const tk = target.status === 'ok' ? target.targets : null
  const wt = await getTranslations('weight')
  const weights = withTrend(
    (bw.data ?? []).map((r: { measured_at: string; weight_kg: number }) => ({
      date: r.measured_at,
      weightKg: Number(r.weight_kg),
    })),
  )
  const wLast = weights[weights.length - 1]
  const w30 = trendChange(weights, 30)
  const stackN = (stack.data ?? []).length
  const takenN = new Set((taken.data ?? []).map((r: { user_supplement_id: string }) => r.user_supplement_id))
    .size
  const lastPain = (pain.data ?? [])[0] as { region: string; score: number } | undefined
  const latestLab = new Map<string, string | null>()
  for (const r of (labs.data ?? []) as { marker: string; flag: string | null }[])
    if (!latestLab.has(r.marker)) latestLab.set(r.marker, r.flag)
  const outOfRange = [...latestLab.values()].filter((f) => f && f !== 'normal').length
  const sl = sleep.data as { duration_min: number | null; quality: number | null } | null
  const rc = rec.data as {
    steps: number | null
    water_ml: number | null
    hrv_ms: number | null
    resting_hr: number | null
    stress: number | null
  } | null
  const trainingDays = prefs.data?.training_days ?? 3
  const reading = readingFor({
    goals: (goals.data ?? []).map((g: { goal: string }) => g.goal),
    painAreas: prefs.data?.pain_areas ?? [],
    sports: prefs.data?.sports ?? [],
  })

  // one practical nudge, most important first
  const hour = now.getHours()
  const tip =
    outOfRange > 0
      ? t('tipLabs', { n: outOfRange })
      : sl?.duration_min !== undefined && sl?.duration_min !== null && sl.duration_min < 360
        ? t('tipSleep')
        : tk && hour >= 15 && protein < tk.proteinG * 0.5
          ? t('tipProtein', { left: Math.round(tk.proteinG - protein) })
          : workouts.length < trainingDays && now.getDay() !== 0
            ? t('tipTrain', { done: workouts.length, plan: trainingDays })
            : t('tipDefault')

  const cards = [
    {
      href: '/train',
      icon: Dumbbell,
      label: t('workout'),
      value: `${workouts.length} / ${trainingDays}`,
      unit: t('thisWeek'),
      sub: workouts[0]?.name,
      good: workouts.length >= trainingDays,
    },
    {
      href: '/eat',
      icon: Apple,
      label: t('meals'),
      value: `${kcal}`,
      unit: tk ? t('ofKcal', { target: tk.kcal }) : 'kcal',
      sub: tk ? `${protein} / ${tk.proteinG} g ${t('protein')}` : undefined,
    },
    {
      href: '/supplements',
      icon: Pill,
      label: t('supplements'),
      value: stackN ? `${takenN} / ${stackN}` : t('empty'),
      good: stackN > 0 && takenN >= stackN,
    },
    {
      href: '/mobility',
      icon: Gauge,
      label: t('pain'),
      value: lastPain ? `${lastPain.score}/10` : t('none'),
      sub: lastPain ? mob(`regions.${lastPain.region}` as 'regions.neck') : undefined,
    },
    {
      href: '#checkin',
      icon: Bed,
      label: t('sleep'),
      value: sl?.duration_min
        ? `${Math.floor(sl.duration_min / 60)} h ${sl.duration_min % 60} min`
        : t('empty'),
    },
    {
      href: '#checkin',
      icon: Activity,
      label: t('steps'),
      value: rc?.steps ? rc.steps.toLocaleString('cs-CZ') : t('empty'),
      sub: rc?.water_ml ? `${(rc.water_ml / 1000).toFixed(1)} l ${t('water').toLowerCase()}` : undefined,
    },
    {
      href: '/body/weight',
      icon: Scale,
      label: wt('todayTile'),
      value: wLast ? `${wLast.trend.toLocaleString('cs-CZ')}` : t('empty'),
      unit: wLast ? 'kg' : undefined,
      sub:
        w30 !== null
          ? wt('tileWeek', {
              v: `${w30 > 0 ? '+' : w30 < 0 ? '−' : ''}${Math.abs(w30).toLocaleString('cs-CZ')}`,
            })
          : undefined,
    },
    {
      href: '/labs',
      icon: FlaskConical,
      label: nav('labs'),
      value: latestLab.size ? t('labsOut', { n: outOfRange }) : t('empty'),
      warn: outOfRange > 0,
    },
  ]

  return (
    <div>
      <p className="eyebrow">{t('subtitle')}</p>
      <h1 className="display mt-2 text-[44px] md:text-[56px]">
        {t('greeting', { name: profile?.display_name ?? '' })}
      </h1>

      <section className="card mt-6 flex gap-4 p-5" aria-label={t('coach')}>
        <Bot size={22} className="text-cyan shrink-0" aria-hidden />
        <div>
          <p className="text-subtle font-mono text-[12px] uppercase">{t('coach')}</p>
          <p className="mt-1 text-[15px]" data-testid="today-tip">
            {tip}
          </p>
          <Link href="/coach" className="link mt-2 inline-block text-[14px]">
            {t('askCoach')} →
          </Link>
        </div>
      </section>

      <ul className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((c) => (
          <li key={c.label}>
            <Link
              href={c.href}
              className="card hover:border-cyan/40 flex h-full flex-col gap-3 p-4 transition"
            >
              <c.icon
                size={20}
                className={cx(c.warn ? 'text-warn' : c.good ? 'text-bio' : 'text-cyan')}
                aria-hidden
              />
              <span>
                <span className="text-subtle block text-[13px]">{c.label}</span>
                <span className="mt-0.5 block font-mono text-[18px] leading-tight">
                  {c.value}
                  {'unit' in c && c.unit && (
                    <span className="text-subtle ml-1.5 font-sans text-[12.5px]">{c.unit}</span>
                  )}
                </span>
                {c.sub && <span className="text-subtle block truncate text-[12.5px]">{c.sub}</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <section className="mt-8" aria-labelledby="reading" data-testid="today-reading">
        <h2 id="reading" className="text-[17px] font-medium">
          {t('readingTitle')}
        </h2>
        <p className="text-subtle mt-1 text-[13.5px]">{t('readingHint')}</p>
        <ul className="mt-3 grid gap-3 md:grid-cols-3">
          {reading.map((g) => (
            <li key={g.slug}>
              <Link
                href={`/jak-funguje-telo/${g.slug}`}
                className="card hover:border-cyan/40 flex h-full flex-col gap-1.5 p-4 transition"
              >
                <span className="text-[15.5px] font-medium">{g.title}</span>
                <span className="text-muted line-clamp-2 text-[13.5px]">{g.hook}</span>
                <span className="text-subtle mt-auto font-mono text-[12px]">
                  {t('readingMinutes', { n: readingMinutes(g) })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-6">
        <CheckIn
          date={today}
          initial={{
            sleep_hours: sl?.duration_min ? Math.round((sl.duration_min / 60) * 10) / 10 : null,
            sleep_quality: sl?.quality ?? null,
            steps: rc?.steps ?? null,
            water_ml: rc?.water_ml ?? null,
            hrv_ms: rc?.hrv_ms ?? null,
            resting_hr: rc?.resting_hr ?? null,
            stress: rc?.stress ?? null,
          }}
        />
      </div>
    </div>
  )
}
