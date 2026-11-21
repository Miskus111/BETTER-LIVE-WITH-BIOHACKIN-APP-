import Link from '@/components/ui/Link'
import { getTranslations } from 'next-intl/server'
import { requireAppUser } from '@/lib/auth'
import { profileTargets } from '@/lib/eat/profile-targets'
import { FoodDiary, type LogRow } from '@/components/eat/FoodDiary'
import { TargetsCard } from '@/components/eat/TargetsCard'

type Db = { from: (t: string) => any } // eslint-disable-line @typescript-eslint/no-explicit-any

export default async function EatPage() {
  const { supabase, profile, user } = await requireAppUser()
  const db = supabase as unknown as Db
  const t = await getTranslations('eat')
  const day = new Date().toISOString().slice(0, 10)
  const [{ data: prefs }, { data: goals }, { data: logs }] = await Promise.all([
    db.from('preferences').select('training_days, work_pattern').eq('user_id', user.id).maybeSingle(),
    db.from('goals').select('goal').order('priority'),
    db
      .from('food_logs')
      .select('id, meal, title, grams, kcal, protein_g, fat_g, carbs_g, fiber_g')
      .eq('logged_on', day)
      .order('created_at'),
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
      <TargetsCard result={result} totals={totals} />
      <FoodDiary rows={rows} day={day} />
    </div>
  )
}
