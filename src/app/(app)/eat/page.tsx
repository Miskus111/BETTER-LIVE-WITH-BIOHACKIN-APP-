import { dayBefore, pragueDay } from '@/lib/dates'
import Link from '@/components/ui/Link'
import { getLocale, getTranslations } from 'next-intl/server'
import { requireAppUser } from '@/lib/auth'
import { profileTargets } from '@/lib/eat/profile-targets'
import { FoodDiary, mealNow, type LogRow } from '@/components/eat/FoodDiary'
import { foodById } from '@/data/foods'
import { TargetsCard } from '@/components/eat/TargetsCard'
import { diaryWeek } from '@/lib/eat/week'

type Db = { from: (t: string) => any } // eslint-disable-line @typescript-eslint/no-explicit-any

export default async function EatPage({ searchParams }: { searchParams: Promise<{ add?: string }> }) {
  // ?add=<food id>: arrived from a food page on the website — open the diary with that food searched
  const prefill = foodById((await searchParams).add ?? '')
  const { supabase, profile, user } = await requireAppUser()
  const db = supabase as unknown as Db
  const t = await getTranslations('eat')
  const day = pragueDay(new Date())
  const [{ data: prefs }, { data: goals }, { data: logs }, { data: weekLogs }] = await Promise.all([
    db
      .from('preferences')
      .select('training_days, work_pattern, diet_type, allergies, dislikes')
      .eq('user_id', user.id)
      .maybeSingle(),
    db.from('goals').select('goal').order('priority'),
    db
      .from('food_logs')
      .select('id, meal, title, grams, kcal, protein_g, fat_g, carbs_g, fiber_g')
      .eq('logged_on', day)
      .order('created_at'),
    db
      .from('food_logs')
      .select('logged_on, kcal, protein_g')
      .gte('logged_on', dayBefore(day, 7))
      .lt('logged_on', day),
  ])
  const rows = (logs ?? []) as LogRow[]
  const totals = rows.reduce(
    (s, r) => ({
      kcal: s.kcal + Number(r.kcal),
      protein: s.protein + Number(r.protein_g),
      fat: s.fat + Number(r.fat_g),
      carbs: s.carbs + Number(r.carbs_g),
      fiber: s.fiber + Number(r.fiber_g),
    }),
    { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 },
  )
  const result = profileTargets(
    profile,
    prefs,
    (goals ?? []).map((g: { goal: string }) => g.goal),
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">
            {t('diary')} · {t('today')}
          </p>
          <h1 className="display mt-2 text-[44px] md:text-[56px]">{t('title')}</h1>
        </div>
        <Link href="/eat/explore" className="btn btn-ghost">
          {t('explore')}
        </Link>
      </div>
      <TargetsCard result={result} totals={totals} week={diaryWeek(weekLogs ?? [], day)} />
      <FoodDiary
        rows={rows}
        day={day}
        prefill={
          prefill
            ? {
                name: (await getLocale()) === 'en' ? prefill.nameEn || prefill.name : prefill.name,
                meal: mealNow(new Date()),
              }
            : undefined
        }
        profile={{
          diet: prefs?.diet_type ?? null,
          allergies: prefs?.allergies ?? [],
          dislikes: prefs?.dislikes ?? [],
        }}
      />
    </div>
  )
}
