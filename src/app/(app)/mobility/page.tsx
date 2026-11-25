import { getTranslations } from 'next-intl/server'
import { HeartPulse } from 'lucide-react'
import { requireAppUser } from '@/lib/auth'
import { ROUTINES } from '@/data/mobility'
import type { Region } from '@/lib/pain/red-flags'
import { PainMap } from '@/components/mobility/PainMap'
import { PainChart } from '@/components/mobility/PainChart'
import { RoutineList } from '@/components/mobility/RoutineList'
import { rankRoutines } from '@/lib/pain/routine-fit'

export async function generateMetadata() {
  const t = await getTranslations('nav')
  return { title: t('mobility') }
}

type Db = { from: (t: string) => any } // eslint-disable-line @typescript-eslint/no-explicit-any

export default async function MobilityPage() {
  const { supabase, user } = await requireAppUser()
  const t = await getTranslations('mob')
  const db = supabase as unknown as Db
  const [{ data }, { data: prefs }] = await Promise.all([
    db.from('pain_reports').select('region, score, reported_at, red_flags').order('reported_at').limit(500),
    db.from('preferences').select('sports, work_pattern, pain_areas').eq('user_id', user.id).maybeSingle(),
  ])
  const { routines, forYou } = rankRoutines(ROUTINES, {
    sports: prefs?.sports ?? [],
    workPattern: prefs?.work_pattern ?? null,
    painAreas: prefs?.pain_areas ?? [],
  })
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

      <RoutineList routines={routines} forYou={forYou} />

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
