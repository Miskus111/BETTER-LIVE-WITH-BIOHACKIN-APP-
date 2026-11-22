import Link from '@/components/ui/Link'
import { getLocale, getTranslations } from 'next-intl/server'
import { Play } from 'lucide-react'
import type { Routine } from '@/data/mobility'

/** Mobility routines in the order that suits the person; the ones picked for them are marked. */
export async function RoutineList({ routines, forYou }: { routines: Routine[]; forYou: Set<string> }) {
  const t = await getTranslations('mob')
  const locale = (await getLocale()) === 'en' ? 'en' : 'cs'
  return (
    <section>
      <h2 className="eyebrow mb-4">{t('routines')}</h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {routines.map((r) => (
          <li key={r.id} data-testid={`routine-${r.id}`}>
            <Link
              href={`/mobility/routine/${r.id}`}
              className="card hover:border-cyan/40 flex h-full items-center justify-between gap-3 p-4"
            >
              <span>
                <span className="block text-[15.5px] font-medium">{r.name[locale]}</span>
                {forYou.has(r.id) && <span className="text-bio block text-[12.5px]">{t('forYou')}</span>}
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
  )
}
