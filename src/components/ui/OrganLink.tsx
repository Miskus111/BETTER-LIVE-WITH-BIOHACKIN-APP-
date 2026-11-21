'use client'

import Link from '@/components/ui/Link'
import { usePathname } from 'next/navigation'
import { ORGAN_BY_ID } from '@/data/organs'
import type { OrganId } from '@/data/types'
import { focusOrgan } from '@/lib/organEvents'

/**
 * Organ chip. On the homepage it selects the organ in the hero body; elsewhere it opens the organ page.
 */
export function OrganLink({ id, detail }: { id: OrganId; detail?: string }) {
  const pathname = usePathname()
  const o = ORGAN_BY_ID[id]
  const cls =
    'inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-[13.5px] text-fg/90 transition hover:border-line-strong hover:bg-white/[0.03]'
  const inner = (
    <>
      <span className="h-2 w-2 rounded-full" style={{ background: o.accent }} aria-hidden />
      {o.shortName}
      {detail && <span className="text-subtle font-mono text-[12px]">{detail}</span>}
    </>
  )
  if (pathname === '/')
    return (
      <button type="button" className={cls} onClick={() => focusOrgan(id)}>
        {inner}
        {/* accessible name starts with the visible text (WCAG 2.5.3 label in name) */}
        <span className="sr-only"> — ukázat na těle</span>
      </button>
    )
  return (
    <Link href={`/organ/${id}`} className={cls}>
      {inner}
    </Link>
  )
}
