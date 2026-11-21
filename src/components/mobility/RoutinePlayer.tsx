'use client'

import Link from '@/components/ui/Link'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { MOBILITY_BY_SLUG, type Routine } from '@/data/mobility'

export function RoutinePlayer({ routine }: { routine: Routine }) {
  const t = useTranslations('mob')
  const locale = useLocale() as 'cs' | 'en'
  const [i, setI] = useState(0)
  const [left, setLeft] = useState<number | null>(null)
  const [running, setRunning] = useState(false)
  const done = i >= routine.items.length
  const m = done ? null : MOBILITY_BY_SLUG[routine.items[i]]

  // new exercise → reset the timer (adjusted during render)
  const [shownI, setShownI] = useState(i)
  if (shownI !== i) {
    setShownI(i)
    setLeft(m?.seconds ?? null)
    setRunning(false)
  }

  // countdown: the tick that reaches zero also stops the timer
  useEffect(() => {
    if (!running || left === null || left <= 0) return
    const id = setTimeout(() => {
      if (left <= 1) {
        navigator.vibrate?.(150)
        setRunning(false)
      }
      setLeft(left - 1)
    }, 1000)
    return () => clearTimeout(id)
  }, [running, left])

  return (
    <div className="max-w-xl">
      <Link href="/mobility" className="link text-[14px]">
        ← {t('title')}
      </Link>
      <h1 className="display mt-3 text-[38px]">{routine.name[locale]}</h1>
      <div className="mt-2 flex gap-1" aria-hidden>
        {routine.items.map((s, k) => (
          <span
            key={s}
            className={`h-1 flex-1 rounded-full ${k < i ? 'bg-bio' : k === i ? 'bg-cyan' : 'bg-white/10'}`}
          />
        ))}
      </div>

      {done || !m ? (
        <div className="card mt-6 p-6 text-center">
          <p className="text-[20px]">{t('finished')}</p>
          <Link href="/mobility" className="btn btn-primary mt-4">
            {t('finish')}
          </Link>
        </div>
      ) : (
        <section className="card mt-6 p-5" aria-live="polite">
          <h2 className="text-[22px] font-medium">{m.name[locale]}</h2>
          <p className="text-muted mt-1 text-[15px]">{m.how[locale]}</p>
          {m.seconds ? (
            <div className="mt-4 flex items-center gap-4">
              <span className="font-mono text-[40px] tabular-nums">{left ?? m.seconds}s</span>
              <button
                type="button"
                onClick={() => setRunning((r) => !r)}
                className="btn btn-ghost"
                aria-label={running ? 'Pause' : 'Play'}
              >
                {running ? <Pause size={18} /> : <Play size={18} />}
              </button>
            </div>
          ) : (
            <p className="mt-4 font-mono text-[34px]">
              {m.reps} {t('reps')}
            </p>
          )}
          <div className="mt-6 flex justify-between">
            <button type="button" className="btn btn-ghost" disabled={i === 0} onClick={() => setI(i - 1)}>
              <ChevronLeft size={16} aria-hidden /> {t('prev')}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setI(i + 1)}
              data-testid="routine-next"
            >
              {t('next')} <ChevronRight size={16} aria-hidden />
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
