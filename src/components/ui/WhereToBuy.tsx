import Link from '@/components/ui/Link'
import { ArrowUpRight, Info, Store } from 'lucide-react'
import { AFFILIATE_DISCLOSURE, affiliateUrl } from '@/data/affiliate'
import { RETAILERS, type ShopLink } from '@/data/retailers'
import { cx } from '@/lib/format'

const KIND: Record<ShopLink['kind'], string> = {
  doplněk: 'Doplněk stravy',
  kategorie: 'Kategorie',
  potravina: 'Potravina',
}

/**
 * Doporučené produkty v českých obchodech. Odkazy jsou partnerské (affiliate) → rel="sponsored",
 * u každého bloku je viditelné upozornění.
 */
export function WhereToBuy({
  links,
  title = 'Kde koupit',
  compact,
  className,
}: {
  links: ShopLink[] | undefined
  title?: string
  compact?: boolean
  className?: string
}) {
  if (!links?.length) return null
  const notes = [...new Set(links.map((l) => l.note).filter(Boolean))] as string[]
  return (
    <div className={className}>
      <p className="text-subtle mb-2 flex items-center gap-1.5 font-mono text-[12px] tracking-wider uppercase">
        <Store size={13} aria-hidden /> {title}
      </p>
      <ul className={cx('grid gap-2', !compact && 'sm:grid-cols-2')}>
        {links.map((l) => (
          <li key={l.url}>
            <a
              href={affiliateUrl(l.url, l.retailer)}
              target="_blank"
              rel="sponsored noopener noreferrer"
              data-retailer={l.retailer}
              className="group border-line hover:border-cyan/40 flex h-full items-center gap-3 rounded-xl border bg-white/[0.02] px-3 py-2.5 transition hover:bg-white/[0.04]"
            >
              <span
                className={cx(
                  'grid h-8 w-8 shrink-0 place-items-center rounded-lg font-mono text-[12px] font-semibold',
                  l.retailer === 'brainmarket' ? 'bg-[#f5c46a]/15 text-[#f5c46a]' : 'bg-cyan/12 text-cyan',
                )}
                aria-hidden
              >
                {l.retailer === 'brainmarket' ? 'BM' : 'VG'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] leading-snug">{l.label}</span>
                <span className="text-subtle block text-[12px]">
                  {RETAILERS[l.retailer].name} · {KIND[l.kind]}
                </span>
                {l.why && <span className="text-muted mt-0.5 block text-[12.5px] leading-snug">{l.why}</span>}
              </span>
              <ArrowUpRight
                size={15}
                className="text-subtle group-hover:text-cyan shrink-0 transition"
                aria-label="(otevře se v novém okně)"
              />
            </a>
          </li>
        ))}
      </ul>
      {notes.map((n) => (
        <p key={n} className="text-warn/90 mt-2 flex gap-1.5 text-[12.5px]">
          <Info size={13} className="mt-0.5 shrink-0" aria-hidden />
          {n}
        </p>
      ))}
      <p className="text-subtle mt-2 text-[12px]" data-testid="affiliate-disclosure">
        {AFFILIATE_DISCLOSURE}{' '}
        <Link href="/jak-doporucujeme" className="hover:text-fg underline underline-offset-2">
          Jak vybíráme
        </Link>
      </p>
    </div>
  )
}
