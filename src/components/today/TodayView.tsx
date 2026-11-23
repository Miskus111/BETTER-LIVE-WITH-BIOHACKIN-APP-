import Link from '@/components/ui/Link'
import { getTranslations } from 'next-intl/server'
import { Bot, type LucideIcon } from 'lucide-react'
import type { ComponentProps } from 'react'
import { CheckIn } from '@/components/today/CheckIn'
import type { BodyGuide } from '@/data/body-guides'
import { cx } from '@/lib/format'
import { readingMinutes } from '@/lib/today/reading'
import type { WeekMetric } from '@/lib/today/week'

export interface TodayCard {
  href: string
  icon: LucideIcon
  label: string
  value: string
  unit?: string
  sub?: string
  good?: boolean
  warn?: boolean
}

/** The Today screen itself, without data loading — so it can also be previewed with sample data. */
export async function TodayView({
  name,
  tip,
  cards,
  reading,
  today,
  checkIn,
  week = [],
  locale = 'cs',
}: {
  name: string
  tip: string
  cards: TodayCard[]
  reading: BodyGuide[]
  today: string
  checkIn: ComponentProps<typeof CheckIn>['initial']
  /** this week's averages from the daily check-in vs the week before */
  week?: WeekMetric[]
  locale?: 'cs' | 'en'
}) {
  const t = await getTranslations('today')
  return (
    <div>
      <p className="eyebrow">{t('subtitle')}</p>
      <h1 className="display mt-2 text-[44px] md:text-[56px]">{t('greeting', { name })}</h1>

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

      {week.length > 0 && (
        <section className="card mt-6 p-5" aria-labelledby="week" data-testid="today-week">
          <h2 id="week" className="text-[17px] font-medium">
            {t('weekTitle')}
          </h2>
          <p className="text-subtle mt-1 text-[13px]">{t('weekHint')}</p>
          <dl className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            {week.map((m) => {
              const nf = new Intl.NumberFormat(locale === 'en' ? 'en' : 'cs-CZ', {
                maximumFractionDigits: m.key === 'sleep' || m.key === 'water' ? 1 : 0,
              })
              const delta = m.now !== null && m.before !== null ? m.now - m.before : null
              return (
                <div key={m.key} data-testid={`week-${m.key}`}>
                  <dt className="text-subtle text-[13px]">{t(`week_${m.key}`)}</dt>
                  <dd className="mt-0.5 font-mono text-[18px] leading-tight">
                    {m.now === null ? '—' : nf.format(m.now)}
                    <span className="text-subtle ml-1 font-sans text-[12.5px]">{t(`weekUnit_${m.key}`)}</span>
                  </dd>
                  <dd className="text-subtle text-[12.5px]">
                    {delta === null
                      ? t('weekNoCompare')
                      : t('weekDelta', {
                          d: `${delta > 0 ? '+' : delta < 0 ? '−' : '±'}${nf.format(Math.abs(delta))}`,
                        })}
                    {m.days < 3 && ` · ${t('weekFewDays', { n: m.days })}`}
                  </dd>
                </div>
              )
            })}
          </dl>
        </section>
      )}

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
        <CheckIn date={today} initial={checkIn} />
      </div>
    </div>
  )
}
