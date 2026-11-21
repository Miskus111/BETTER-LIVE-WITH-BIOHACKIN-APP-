import Link from '@/components/ui/Link'
import { notFound } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CheckCircle2 } from 'lucide-react'
import { EXERCISE_BY_SLUG, GENERIC_STEPS } from '@/data/exercises'

export default async function ExercisePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const e = EXERCISE_BY_SLUG[slug]
  if (!e) notFound()
  const locale = (await getLocale()) as 'cs' | 'en'
  const t = await getTranslations('train')
  const m = await getTranslations('muscles')
  const q = await getTranslations('equipment')
  const link = (s: string) => (
    <Link key={s} href={`/train/exercises/${s}`} className="chip">
      {EXERCISE_BY_SLUG[s].name[locale]}
    </Link>
  )
  return (
    <article className="max-w-3xl">
      <Link href="/train/exercises" className="link text-[14px]">
        ← {t('library')}
      </Link>
      <h1 className="display mt-3 text-[40px] md:text-[52px]">{e.name[locale]}</h1>

      <dl className="mt-6 grid gap-4 sm:grid-cols-3">
        <div>
          <dt className="eyebrow">{t('primary')}</dt>
          <dd className="mt-1">{e.primary.map((p) => m(p)).join(', ')}</dd>
        </div>
        <div>
          <dt className="eyebrow">{t('secondary')}</dt>
          <dd className="mt-1">{e.secondary.map((p) => m(p)).join(', ') || '—'}</dd>
        </div>
        <div>
          <dt className="eyebrow">{t('equipment')}</dt>
          <dd className="mt-1">{e.equipment.map((x) => q(x)).join(', ')}</dd>
        </div>
      </dl>

      <section className="card mt-6 p-5">
        <h2 className="eyebrow mb-3">{t('steps')}</h2>
        <ol className="list-decimal space-y-1.5 pl-5 text-[15px]">
          {GENERIC_STEPS[locale].map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <p className="mt-4 flex gap-2 text-[15px]">
          <CheckCircle2 size={17} className="text-bio mt-0.5 shrink-0" aria-hidden />
          <span>
            <strong className="font-medium">{t('cue')}:</strong> {e.cue[locale]}
          </span>
        </p>
        <p className="mt-2 flex gap-2 text-[15px]">
          <AlertTriangle size={17} className="text-warn mt-0.5 shrink-0" aria-hidden />
          <span>
            <strong className="font-medium">{t('mistake')}:</strong> {e.mistake[locale]}
          </span>
        </p>
      </section>

      {(e.regressions.length > 0 || e.progressions.length > 0) && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {e.regressions.length > 0 && (
            <section>
              <h2 className="eyebrow mb-2 flex items-center gap-1.5">
                <ArrowDownRight size={14} aria-hidden /> {t('easier')}
              </h2>
              <div className="flex flex-wrap gap-2">{e.regressions.map(link)}</div>
            </section>
          )}
          {e.progressions.length > 0 && (
            <section>
              <h2 className="eyebrow mb-2 flex items-center gap-1.5">
                <ArrowUpRight size={14} aria-hidden /> {t('harder')}
              </h2>
              <div className="flex flex-wrap gap-2">{e.progressions.map(link)}</div>
            </section>
          )}
        </div>
      )}
    </article>
  )
}
