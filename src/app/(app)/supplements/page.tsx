import Link from '@/components/ui/Link'
import { getLocale, getTranslations } from 'next-intl/server'
import { requireAppUser } from '@/lib/auth'
import { StackTracker, type StackRow } from '@/components/supplements/StackTracker'
import { SUPPLEMENT_BY_ID, type SupplementId } from '@/data/supplement-library'
import { profileSuggestions } from '@/lib/supplements/suggestions'
import { cx } from '@/lib/format'

type Db = { from: (t: string) => any } // eslint-disable-line @typescript-eslint/no-explicit-any

export default async function SupplementsPage() {
  const { supabase, user } = await requireAppUser()
  const db = supabase as unknown as Db
  const t = await getTranslations('supp')
  const since = new Date()
  since.setHours(0, 0, 0, 0)
  const [{ data: stack }, { data: logs }, { data: prefs }] = await Promise.all([
    db
      .from('user_supplements')
      .select('id, dose_amount, timing, reminder_time, supplements(slug)')
      .eq('active', true)
      .order('created_at'),
    db.from('supplement_logs').select('user_supplement_id').gte('taken_at', since.toISOString()),
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
  const locale = (await getLocale()) === 'en' ? 'en' : 'cs'
  const suggestions = profileSuggestions({
    diet: prefs?.diet_type ?? null,
    allergies: prefs?.allergies ?? [],
    month: new Date().getMonth() + 1,
    stack: rows.map((r) => r.slug),
  })
  return (
    <div>
      <h1 className="display mb-6 text-[44px] md:text-[56px]">{t('title')}</h1>
      {suggestions.length > 0 && (
        <section className="card mb-6 p-5" aria-labelledby="for-profile" data-testid="supp-suggestions">
          <h2 id="for-profile" className="text-[17px] font-medium">
            {t('forProfile')}
          </h2>
          <ul className="mt-3 space-y-3">
            {suggestions.map((s) => (
              <li key={s.id} className="flex gap-3">
                <span
                  className={cx(
                    'mt-0.5 h-fit shrink-0 rounded-full px-2 py-0.5 font-mono text-[11.5px]',
                    s.strength === 'needed' ? 'bg-warn/15 text-warn' : 'bg-cyan/10 text-cyan',
                  )}
                >
                  {t(s.strength)}
                </span>
                <span className="text-[14.5px]">
                  <span className="font-medium">{SUPPLEMENT_BY_ID[s.id].name[locale]}</span> — {t(s.reason)}{' '}
                  <Link href={`/doplnky/${s.guide}`} className="link whitespace-nowrap">
                    {t('readGuide')} →
                  </Link>
                </span>
              </li>
            ))}
          </ul>
          <p className="text-subtle mt-4 text-[12.5px]">{t('forProfileNote')}</p>
        </section>
      )}
      <StackTracker rows={rows} medications={prefs?.medications ?? null} />
    </div>
  )
}
