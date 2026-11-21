'use client'

import Link from '@/components/ui/Link'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { BookOpen } from 'lucide-react'
import { GLOSSARY_BY_ID } from '@/data/glossary'

/**
 * A glossary word inside running text: dotted underline; hover (desktop) or tap opens a short
 * definition with a link to the guide that explains it more.
 */
export function Term({
  id,
  here,
  children,
}: {
  id: string
  /** slug of the guide the reader is on — no link back to the same page */
  here?: string
  children: React.ReactNode
}) {
  const t = GLOSSARY_BY_ID[id]
  const [open, setOpen] = useState(false)
  const [shift, setShift] = useState(0)
  const wrap = useRef<HTMLSpanElement>(null)
  const card = useRef<HTMLSpanElement>(null)
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const tipId = useId()

  // keep the card inside the viewport (16 px gutter)
  useLayoutEffect(() => {
    if (!open || !card.current) return
    const r = card.current.getBoundingClientRect()
    const over = r.right - (document.documentElement.clientWidth - 16)
    const under = 16 - r.left
    setShift((s) => s + (over > 0 ? -over : under > 0 ? under : 0))
  }, [open])

  // clear a pending hover timer when the term unmounts (e.g. client-side navigation)
  useEffect(() => () => clearTimeout(hoverTimer.current), [])

  useEffect(() => {
    if (!open) return
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key !== 'Escape') return
      if (e instanceof PointerEvent && wrap.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  if (!t) return <>{children}</>

  const toggle = () => {
    setShift(0)
    setOpen((o) => !o)
  }
  const hover = (v: boolean) => {
    clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => setOpen(v), v ? 180 : 220)
  }

  return (
    <span
      ref={wrap}
      className="relative inline"
      onPointerEnter={(e) => e.pointerType === 'mouse' && hover(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && hover(false)}
    >
      <span
        role="button"
        tabIndex={0}
        className="term"
        aria-expanded={open}
        aria-describedby={open ? tipId : undefined}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            toggle()
          }
        }}
        data-term={id}
      >
        {children}
      </span>
      {open && (
        <span ref={card} id={tipId} role="tooltip" className="term-card" style={{ marginLeft: shift }}>
          <span className="text-fg block text-[14px] font-medium">{t.term}</span>
          <span className="text-muted mt-1 block text-[13.5px] leading-snug">{t.def}</span>
          {t.guide && t.guide !== here && (
            <Link
              href={`/jak-funguje-telo/${t.guide}`}
              className="text-cyan mt-2 inline-flex items-center gap-1 text-[12.5px]"
            >
              <BookOpen size={12} aria-hidden /> Víc v průvodci
            </Link>
          )}
        </span>
      )}
    </span>
  )
}
