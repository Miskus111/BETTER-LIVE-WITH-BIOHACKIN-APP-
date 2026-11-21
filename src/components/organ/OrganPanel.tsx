'use client'

import Link from '@/components/ui/Link'
import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, ExternalLink, X } from 'lucide-react'
import { SYSTEMS } from '@/data/sources'
import type { Organ } from '@/data/types'
import { cx } from '@/lib/format'
import { OverviewTab } from './tabs/OverviewTab'
import { NutrientsTab } from './tabs/NutrientsTab'
import { FoodsTab } from './tabs/FoodsTab'
import { SupplementsTab } from './tabs/SupplementsTab'
import { ScienceTab } from './tabs/ScienceTab'

export const ORGAN_TABS = ['Přehled', 'Živiny', 'Potraviny', 'Doplňky', 'Věda'] as const
export type OrganTab = (typeof ORGAN_TABS)[number]

interface Props {
  organ: Organ
  onClose?: () => void
  onPrev?: () => void
  onNext?: () => void
  /** 'panel' = homepage hero (h2 + link to the shareable page); 'page' = organ page (h1) */
  variant?: 'panel' | 'page'
}

export function OrganPanel({ organ, onClose, onPrev, onNext, variant = 'panel' }: Props) {
  const [tab, setTab] = useState<OrganTab>('Přehled')
  const body = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  // new organ → back to overview (adjusted during render, not in an effect) and scroll to top
  const [shownId, setShownId] = useState(organ.id)
  if (shownId !== organ.id) {
    setShownId(organ.id)
    setTab('Přehled')
  }
  useEffect(() => {
    body.current?.scrollTo({ top: 0 })
  }, [organ.id])

  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!dir) return
    e.preventDefault()
    const next = (i + dir + ORGAN_TABS.length) % ORGAN_TABS.length
    setTab(ORGAN_TABS[next])
    tabRefs.current[next]?.focus()
  }

  const system = SYSTEMS.find((s) => s.id === organ.system)?.name

  return (
    <section
      aria-label={`${organ.shortName} — detail`}
      className="flex h-full min-h-0 flex-col"
      style={{ ['--accent' as string]: organ.accent } as React.CSSProperties}
      data-testid="organ-panel"
    >
      <header className="border-line shrink-0 border-b px-5 pt-5 pb-0 md:px-6">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: organ.accent, boxShadow: `0 0 12px ${organ.accent}` }}
          />
          <span className="eyebrow !text-muted">Soustava: {system}</span>
          <div className="ml-auto flex items-center gap-1">
            {onPrev && (
              <IconBtn label="Předchozí orgán" onClick={onPrev}>
                <ChevronLeft size={16} />
              </IconBtn>
            )}
            {onNext && (
              <IconBtn label="Další orgán" onClick={onNext}>
                <ChevronRight size={16} />
              </IconBtn>
            )}
            {onClose && (
              <IconBtn label="Zavřít panel" onClick={onClose}>
                <X size={16} />
              </IconBtn>
            )}
          </div>
        </div>
        {variant === 'panel' ? (
          <h2 className="display mt-2 text-[38px]">{organ.name}</h2>
        ) : (
          <h1 className="display mt-2 text-[44px] md:text-[56px]">{organ.name}</h1>
        )}
        <p className="text-muted mt-1 font-mono text-[13px]">{organ.tagline}</p>
        {variant === 'panel' && (
          <Link
            href={`/organ/${organ.id}`}
            className="link mt-2 inline-flex items-center gap-1 text-[13.5px]"
          >
            Otevřít stránku ke sdílení <ExternalLink size={13} aria-hidden />
          </Link>
        )}

        <div
          role="tablist"
          aria-label="Informace o orgánu"
          className="no-scrollbar -mx-1 mt-4 flex gap-1 overflow-x-auto"
        >
          {ORGAN_TABS.map((t, i) => (
            <button
              key={t}
              ref={(el) => {
                tabRefs.current[i] = el
              }}
              role="tab"
              id={`tab-${organ.id}-${t}`}
              aria-selected={tab === t}
              aria-controls={`panel-${organ.id}-${t}`}
              tabIndex={tab === t ? 0 : -1}
              onClick={() => setTab(t)}
              onKeyDown={(e) => onTabKey(e, i)}
              className={cx(
                'relative shrink-0 px-3 pt-1 pb-3 text-[14.5px] transition-colors',
                tab === t ? 'text-fg' : 'text-muted hover:text-fg',
              )}
            >
              {t}
              {tab === t && (
                <span
                  className="absolute inset-x-2 bottom-0 h-0.5 rounded-full"
                  style={{ background: organ.accent }}
                />
              )}
            </button>
          ))}
        </div>
      </header>

      <div ref={body} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 md:px-6">
        {ORGAN_TABS.map((t) => (
          <div
            key={t}
            role="tabpanel"
            id={`panel-${organ.id}-${t}`}
            aria-labelledby={`tab-${organ.id}-${t}`}
            hidden={tab !== t}
            className={tab === t ? 'fade-up' : undefined}
          >
            {/* keeps the heading outline h1/h2 → h2 → h3 for screen readers */}
            <h2 className="sr-only">
              {organ.shortName}: {t}
            </h2>
            {t === 'Přehled' && <OverviewTab organ={organ} goTo={setTab} />}
            {t === 'Živiny' && <NutrientsTab organ={organ} />}
            {t === 'Potraviny' && <FoodsTab organ={organ} />}
            {t === 'Doplňky' && <SupplementsTab organ={organ} />}
            {t === 'Věda' && <ScienceTab organ={organ} />}
          </div>
        ))}
      </div>
    </section>
  )
}

function IconBtn({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="border-line text-muted hover:border-line-strong hover:text-fg grid h-8 w-8 place-items-center rounded-full border transition"
    >
      {children}
    </button>
  )
}
