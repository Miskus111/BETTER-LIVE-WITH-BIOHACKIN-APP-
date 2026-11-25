'use client'

import { useTranslations, useLocale } from 'next-intl'
import { useEscape } from '@/lib/useEscape'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { EXERCISES, MUSCLES, type Muscle } from '@/data/exercises'
import { cx } from '@/lib/format'

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Modal list for adding exercises to a workout; filter by text and muscle. */
export function ExercisePicker({ onPick, onClose }: { onPick: (slug: string) => void; onClose: () => void }) {
  const t = useTranslations('train')
  const common = useTranslations('common')
  useEscape(onClose)
  const m = useTranslations('muscles')
  const locale = useLocale() as 'cs' | 'en'
  const [q, setQ] = useState('')
  const [muscle, setMuscle] = useState<Muscle | null>(null)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => input.current?.focus(), [])

  const list = useMemo(() => {
    const nq = norm(q)
    return EXERCISES.filter(
      (e) =>
        (!muscle || e.primary.includes(muscle) || e.secondary.includes(muscle)) &&
        (!nq || norm(e.name.cs).includes(nq) || norm(e.name.en).includes(nq)),
    ).sort((a, b) => a.name[locale].localeCompare(b.name[locale], locale))
  }, [q, muscle, locale])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('addExercise')}
        className="bg-ink-3 border-line flex max-h-[88svh] w-full max-w-lg flex-col rounded-t-3xl border sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-line focus-within:border-cyan flex items-center gap-2 border-b px-4 py-3 transition-colors">
          <Search size={17} className="text-subtle" aria-hidden />
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('search')}
            className="h-10 flex-1 bg-transparent text-[16px] outline-none"
            data-testid="exercise-search"
          />
          <button type="button" onClick={onClose} aria-label={common('close')} className="text-subtle p-1">
            <X size={18} />
          </button>
        </div>
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-4 py-3">
          <button
            type="button"
            className="chip shrink-0"
            aria-pressed={!muscle}
            onClick={() => setMuscle(null)}
          >
            {t('allMuscles')}
          </button>
          {MUSCLES.map((x) => (
            <button
              key={x}
              type="button"
              className="chip shrink-0"
              aria-pressed={muscle === x}
              onClick={() => setMuscle(muscle === x ? null : x)}
            >
              {m(x)}
            </button>
          ))}
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
          {list.length === 0 && <li className="text-muted px-3 py-6 text-center">{t('noResults')}</li>}
          {list.map((e) => (
            <li key={e.slug}>
              <button
                type="button"
                onClick={() => onPick(e.slug)}
                className={cx(
                  'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/[0.05]',
                )}
                data-testid={`pick-${e.slug}`}
              >
                <span className="text-[15px]">{e.name[locale]}</span>
                <span className="text-subtle truncate font-mono text-[12px]">
                  {e.primary.map((p) => m(p)).join(', ')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
