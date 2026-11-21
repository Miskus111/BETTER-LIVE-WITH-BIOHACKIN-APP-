import Link from '@/components/ui/Link'
import { getLocale, getTranslations } from 'next-intl/server'
import { HeartPulse, Play } from 'lucide-react'
import { requireAppUser } from '@/lib/auth'
import { ROUTINES } from '@/data/mobility'
import type { Region } from '@/lib/pain/red-flags'
import { PainMap } from '@/components/mobility/PainMap'
import { PainChart } from '@/components/mobility/PainChart'

type Db = { from: (t: string) => any } // eslint-disable-line @typescript-eslint/no-explicit-any

export default async function MobilityPage() {
  const { supabase } = await requireAppUser()
  const t = await getTranslations('mob')
  const locale = (await getLocale()) as 'cs' | 'en'
  const { data } = await (supabase as unknown as Db)
    .from('pain_reports')
    .select('region, score, reported_at, red_flags')
    .order('reported_at')
    .limit(500)
  const reports = (data ?? []) as { region: Region; score: number; reported_at: string }[]
  const latest: Partial<Record<Region, number>> = {}
  for (const r of reports) latest[r.region] = r.score

  return (
    <div className="space-y-12">
      <div>
        <h1 className="display text-[44px] md:text-[56px]">{t('title')}</h1>
        <a
          href="#pain"
          className="card hover:border-cyan/40 mt-5 flex items-center gap-3 p-4 text-[15px] transition"
        >
          <HeartPulse size={20} className="text-warn shrink-0" aria-hidden />
          <span className="flex-1">{t('painJump')}</span>
          <span className="text-cyan" aria-hidden>
            →
          </span>
        </a>
      </div>

      <section>
        <h2 className="eyebrow mb-4">{t('routines')}</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ROUTINES.map((r) => (
            <li key={r.id}>
              <Link
                href={`/mobility/routine/${r.id}`}
                className="card hover:border-cyan/40 flex h-full items-center justify-between gap-3 p-4"
              >
                <span>
                  <span className="block text-[15.5px] font-medium">{r.name[locale]}</span>
                  <span className="text-subtle font-mono text-[12.5px]">
                    {r.minutes} {t('min')} · {t('exercisesCount', { n: r.items.length })}
                  </span>
                </span>
                <Play size={18} className="text-cyan shrink-0" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section id="pain">
        <h2 className="eyebrow mb-4">{t('pain')}</h2>
        <PainMap latest={latest} />
      </section>

      <section>
        <h2 className="eyebrow mb-4">{t('history')}</h2>
        <PainChart reports={reports} />
      </section>
    </div>
  )
}
