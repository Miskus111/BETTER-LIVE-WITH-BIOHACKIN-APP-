'use client'

import { localDay } from '@/lib/dates'

import Link from '@/components/ui/Link'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { cx } from '@/lib/format'

export interface Habit {
  id: string
  title: string
  howTo: string
  /** evidence level key (established / plausible / preliminary), translated here */
  level: 'established' | 'plausible' | 'preliminary'
}

const KEY = 'blwb-looks-v1'
const today = () => localDay(new Date())

/** Daily checklist of the evidence-based looks habits. Stored on this device only (no health data). */
export function LooksHabits({ habits }: { habits: Habit[] }) {
  const t = useTranslations('looks')
  const ev = useTranslations('evidence')
  const [done, setDone] = useState<Record<string, string[]>>({})
  useEffect(() => {
    try {
      // localStorage exists only in the browser: read it once after hydration
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDone(JSON.parse(localStorage.getItem(KEY) ?? '{}'))
    } catch {
      /* private mode */
    }
  }, [])
  const d = today()
  const todays = new Set(done[d] ?? [])
  const toggle = (id: string) => {
    const next = new Set(todays)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    // keep the last 30 days only
    const keep = Object.fromEntries(
      Object.entries({ ...done, [d]: [...next] })
        .sort()
        .slice(-30),
    )
    setDone(keep)
    try {
      localStorage.setItem(KEY, JSON.stringify(keep))
    } catch {
      /* ignore */
    }
  }
  const streak = (() => {
    let n = 0
    const day = new Date()
    for (;;) {
      const k = localDay(day)
      if ((done[k]?.length ?? 0) >= Math.ceil(habits.length / 2)) n++
      else if (k !== d) break
      day.setDate(day.getDate() - 1)
      if (n > 365) break
    }
    return n
  })()

  return (
    <div>
      <p className="text-muted max-w-2xl text-[15px]">{t('intro')}</p>
      <p className="text-subtle mt-2 font-mono text-[13px]">
        {t('progress', { done: todays.size, total: habits.length })} · {t('streak', { n: streak })}
      </p>
      <ul className="mt-5 grid gap-3 md:grid-cols-2">
        {habits.map((h) => {
          const on = todays.has(h.id)
          return (
            <li key={h.id}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => toggle(h.id)}
                className={cx(
                  'card flex w-full gap-4 p-4 text-left transition',
                  on ? 'border-bio/50 bg-bio/[0.05]' : 'hover:border-cyan/40',
                )}
                data-testid={`habit-${h.id}`}
              >
                <span
                  className={cx(
                    'grid h-7 w-7 shrink-0 place-items-center rounded-full border',
                    on ? 'border-bio bg-bio text-ink' : 'border-line',
                  )}
                >
                  {on && <Check size={15} />}
                </span>
                <span>
                  <span className="block text-[16px] font-medium">{h.title}</span>
                  <span className="text-muted mt-1 block text-[14px]">{h.howTo}</span>
                  <span className="text-subtle mt-1 block font-mono text-[11.5px] uppercase">
                    {t('evidence')}: {ev(h.level)}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <Link href="/looksmaxing" className="link mt-6 inline-block text-[15px]">
        {t('readMore')} →
      </Link>
      <p className="text-subtle mt-4 max-w-2xl text-[13px]">{t('safety')}</p>
    </div>
  )
}
