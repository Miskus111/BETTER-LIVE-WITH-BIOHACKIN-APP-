import { pragueDay, pragueMidnight } from '@/lib/dates'
import { getTranslations } from 'next-intl/server'
import { requireAppUser } from '@/lib/auth'
import { StackTracker, type StackRow } from '@/components/supplements/StackTracker'
import { ProfileSuggestions } from '@/components/supplements/ProfileSuggestions'
import type { SupplementId } from '@/data/supplement-library'
import { profileSuggestions } from '@/lib/supplements/suggestions'
import { lastSevenDays } from '@/lib/supplements/adherence'

type Db = { from: (t: string) => any } // eslint-disable-line @typescript-eslint/no-explicit-any

export default async function SupplementsPage() {
  const { supabase, user } = await requireAppUser()
  const db = supabase as unknown as Db
  const t = await getTranslations('supp')
  // today starts at midnight in Prague (the server runs on UTC)
  const since = pragueMidnight(pragueDay(new Date()))
  const [{ data: stack }, { data: logs }, { data: weekLogs }, { data: prefs }] = await Promise.all([
    db
      .from('user_supplements')
      .select('id, dose_amount, timing, reminder_time, supplements(slug)')
      .eq('active', true)
      .order('created_at'),
    db.from('supplement_logs').select('user_supplement_id').gte('taken_at', since.toISOString()),
    db
      .from('supplement_logs')
      .select('user_supplement_id, taken_at')
      .gte('taken_at', new Date(since.getTime() - 7 * 864e5).toISOString()),
    db.from('preferences').select('medications, diet_type, allergies').eq('user_id', user.id).maybeSingle(),
  ])
  const taken = new Set((logs ?? []).map((l: { user_supplement_id: string }) => l.user_supplement_id))
  const rows: StackRow[] = (stack ?? []).map(
    (r: {
      id: string
      dose_amount: number
      timing: string
      reminder_time: string | null
      supplements: { slug: string } | null
    }) => ({
      id: r.id,
      slug: (r.supplements?.slug ?? '') as SupplementId,
      dose_amount: r.dose_amount,
      timing: r.timing,
      reminder_time: r.reminder_time,
      takenToday: taken.has(r.id),
    }),
  )
  const history = lastSevenDays(
    weekLogs ?? [],
    rows.map((r) => r.id),
    new Date(),
  )
  for (const r of rows) r.week = history[r.id]
  const suggestions = profileSuggestions({
    diet: prefs?.diet_type ?? null,
    allergies: prefs?.allergies ?? [],
    month: new Date().getMonth() + 1,
    stack: rows.map((r) => r.slug),
  })
  return (
    <div>
      <h1 className="display mb-6 text-[44px] md:text-[56px]">{t('title')}</h1>
      <ProfileSuggestions suggestions={suggestions} />
      <StackTracker rows={rows} medications={prefs?.medications ?? null} />
    </div>
  )
}
