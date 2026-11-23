import { dayBefore, pragueDay, pragueMidnight, pragueMonday } from '@/lib/dates'
import { getLocale, getTranslations } from 'next-intl/server'
import { Activity, Apple, Bed, Dumbbell, FlaskConical, Gauge, Pill, Scale } from 'lucide-react'
import { requireAppUser } from '@/lib/auth'
import { profileTargets } from '@/lib/eat/profile-targets'
import { TodayView, type TodayCard } from '@/components/today/TodayView'
import { trendChange, withTrend } from '@/lib/body/weight'
import { readingFor } from '@/lib/today/reading'
import { todayTip } from '@/lib/today/tip'
import { weekOverview } from '@/lib/today/week'

type Db = { from: (t: string) => any } // eslint-disable-line @typescript-eslint/no-explicit-any
const iso = (d: Date) => d.toISOString().slice(0, 10)

export default async function TodayPage() {
  const { profile, supabase, user } = await requireAppUser()
  const db = supabase as unknown as Db
  const t = await getTranslations('today')
  const nav = await getTranslations('nav')
  const mob = await getTranslations('mob')

  const now = new Date()
  // calendar days in Prague (the server runs on UTC)
  const today = pragueDay(now)
  const yesterday = dayBefore(today, 1)
  // week and day start at midnight in Prague, not UTC
  const weekStart = pragueMidnight(pragueMonday(today))
  const dayStart = pragueMidnight(today)

  const [w, food, stack, taken, pain, sleep, rec, labs, goals, prefs, bw, sleep14, rec14] = await Promise.all(
    [
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
      // two weeks of check-ins for the weekly overview
      db.from('sleep_logs').select('night_of, duration_min').gte('night_of', dayBefore(today, 14)),
      db
        .from('recovery_logs')
        .select('logged_on, steps, water_ml, resting_hr')
        .gte('logged_on', dayBefore(today, 13)),
    ],
  )

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

  // one practical nudge, most important first (hour in Prague: servers run on UTC)
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Europe/Prague' }).format(
      now,
    ),
  )
  const lastPainAt = (pain.data ?? [])[0]?.reported_at as string | undefined
  const tipChoice = todayTip({
    outOfRange,
    sleepMin: sl?.duration_min ?? null,
    hour,
    protein,
    proteinTarget: tk?.proteinG ?? null,
    workouts: workouts.length,
    trainingDays,
    weekday: new Date(`${today}T12:00:00Z`).getUTCDay(), // day of the week in Prague
    pain: lastPain
      ? { ...lastPain, ageDays: lastPainAt ? (now.getTime() - new Date(lastPainAt).getTime()) / 864e5 : 99 }
      : null,
  })
  const tip =
    tipChoice.key === 'tipPain'
      ? t('tipPain', {
          score: tipChoice.score,
          region: mob(`regions.${tipChoice.region}` as 'regions.neck').toLowerCase(),
        })
      : tipChoice.key === 'tipLabs'
        ? t('tipLabs', { n: tipChoice.n })
        : tipChoice.key === 'tipProtein'
          ? t('tipProtein', { left: tipChoice.left })
          : tipChoice.key === 'tipTrain'
            ? t('tipTrain', { done: tipChoice.done, plan: tipChoice.plan })
            : t(tipChoice.key)

  const cards: TodayCard[] = [
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
    <TodayView
      name={profile?.display_name ?? ''}
      tip={tip}
      cards={cards}
      reading={reading}
      today={today}
      week={weekOverview(sleep14.data ?? [], rec14.data ?? [], today)}
      locale={(await getLocale()) === 'en' ? 'en' : 'cs'}
      checkIn={{
        sleep_hours: sl?.duration_min ? Math.round((sl.duration_min / 60) * 10) / 10 : null,
        sleep_quality: sl?.quality ?? null,
        steps: rc?.steps ?? null,
        water_ml: rc?.water_ml ?? null,
        hrv_ms: rc?.hrv_ms ?? null,
        resting_hr: rc?.resting_hr ?? null,
        stress: rc?.stress ?? null,
      }}
    />
  )
}
