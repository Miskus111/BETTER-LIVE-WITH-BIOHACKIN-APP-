import { getLocale, getTranslations } from 'next-intl/server'
import { HeartHandshake, ShieldCheck } from 'lucide-react'
import type { Targets } from '@/lib/eat/targets'
import { cx } from '@/lib/format'

type Totals = { kcal: number; protein: number; fat: number; carbs: number; fiber: number }

export async function TargetsCard({
  result,
  totals,
  week = null,
}: {
  result:
    | { status: 'ok'; targets: Targets & { bmr: number; tdee: number } }
    | { status: 'incomplete' }
    | { status: 'support' }
  totals: Totals
  /** average of the past 7 logged days (today excluded) */
  week?: { days: number; kcal: number; protein: number } | null
}) {
  const t = await getTranslations('eat')
  // numbers in the app's language ("72.4" in English, "72,4" in Czech)
  const nl = (await getLocale()) === 'en' ? 'en' : 'cs-CZ'
  if (result.status === 'incomplete') return <p className="card text-muted p-5">{t('missingProfile')}</p>
  if (result.status === 'support')
    return (
      <section className="card flex gap-4 p-5" data-testid="eat-support">
        <HeartHandshake size={24} className="text-cyan shrink-0" aria-hidden />
        <div>
          <p className="font-medium">{t('supportTitle')}</p>
          <p className="text-muted mt-1 text-[14.5px]">{t('supportText')}</p>
          <p className="mt-2 text-[14px]">{t('supportLinks')}</p>
        </div>
      </section>
    )
  const tg = result.targets
  const rows: { key: keyof Totals; label: string; target: number; unit: string }[] = [
    { key: 'kcal', label: t('kcal'), target: tg.kcal, unit: '' },
    { key: 'protein', label: t('protein'), target: tg.proteinG, unit: 'g' },
    { key: 'carbs', label: t('carbs'), target: tg.carbsG, unit: 'g' },
    { key: 'fat', label: t('fat'), target: tg.fatG, unit: 'g' },
    { key: 'fiber', label: t('fiber'), target: tg.fiberG, unit: 'g' },
  ]
  return (
    <section className="card p-5" data-testid="eat-targets">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="eyebrow">{t('targets')}</h2>
        <span className="text-subtle font-mono text-[12.5px]">
          {t('bmr')} {tg.bmr.toLocaleString(nl)} · {t('tdee')} {tg.tdee.toLocaleString(nl)} kcal
        </span>
      </div>
      <ul className="mt-4 grid gap-3 sm:grid-cols-5">
        {rows.map((r) => {
          const v = Math.round(totals[r.key])
          const pct = r.target ? Math.min(100, (v / r.target) * 100) : 0
          const over = v > r.target * 1.1 && r.key !== 'fiber' && r.key !== 'protein'
          return (
            <li key={r.key}>
              <div className="flex items-baseline justify-between">
                <span className="text-muted text-[13.5px]">{r.label}</span>
                <span className="font-mono text-[13px]">
                  {v.toLocaleString(nl)}
                  <span className="text-subtle">
                    {' '}
                    / {r.target.toLocaleString(nl)}
                    {r.unit && ` ${r.unit}`}
                  </span>
                </span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-white/[0.06]">
                <div
                  className={cx('h-full rounded-full', over ? 'bg-warn' : 'bg-cyan')}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>
      {week && (
        <p className="text-muted mt-4 text-[13.5px]" data-testid="eat-week">
          {t('weekAverage', {
            days: week.days,
            kcal: week.kcal.toLocaleString(nl),
            kcalTarget: tg.kcal.toLocaleString(nl),
            protein: week.protein,
            proteinTarget: tg.proteinG,
          })}
        </p>
      )}
      {tg.limited && (
        <p className="text-subtle mt-3 flex gap-1.5 text-[12.5px]">
          <ShieldCheck size={14} className="mt-0.5 shrink-0" aria-hidden /> {t('floorNote')}
        </p>
      )}
    </section>
  )
}
