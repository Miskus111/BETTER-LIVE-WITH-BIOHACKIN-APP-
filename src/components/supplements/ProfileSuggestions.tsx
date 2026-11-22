import Link from '@/components/ui/Link'
import { getLocale, getTranslations } from 'next-intl/server'
import { SUPPLEMENT_BY_ID } from '@/data/supplement-library'
import type { Suggestion } from '@/lib/supplements/suggestions'
import { cx } from '@/lib/format'

/** Supplements the profile points to (diet, season, allergies) — general suggestions, never doses. */
export async function ProfileSuggestions({ suggestions }: { suggestions: Suggestion[] }) {
  if (!suggestions.length) return null
  const t = await getTranslations('supp')
  const locale = (await getLocale()) === 'en' ? 'en' : 'cs'
  return (
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
  )
}
