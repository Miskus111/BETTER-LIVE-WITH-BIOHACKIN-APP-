import Link from '@/components/ui/Link'
import { ArrowRight, Salad } from 'lucide-react'
import { ABSORPTION } from '@/data/absorption'
import { NUTRIENTS } from '@/data/nutrients'
import { WHERE_TO_BUY, type ShopLink } from '@/data/retailers'
import type { Organ } from '@/data/types'
import { RatingBadge } from '@/components/ui/AbsorptionCard'
import { WhereToBuy } from '@/components/ui/WhereToBuy'
import { supplementHref } from '@/data/supplements'

/** Nejlépe vstřebatelné formy živin, na kterých orgán závisí, + doporučené produkty. */
export function SupplementsTab({ organ }: { organ: Organ }) {
  const items = organ.nutrients.filter(
    (n) => (n.relation ?? 'supports') === 'supports' && n.level !== 'preliminary' && ABSORPTION[n.id],
  )
  const links = [
    ...new Map(
      items.flatMap((n) => WHERE_TO_BUY[n.id] ?? []).map((l): [string, ShopLink] => [l.url, l]),
    ).values(),
  ].slice(0, 6)

  return (
    <div className="space-y-5">
      <p className="text-muted flex gap-2 text-[14px]">
        <Salad size={16} className="text-bio mt-0.5 shrink-0" aria-hidden />
        Nejdřív strava — záložka Potraviny. Doplněk dává smysl, když strava nestačí; tady je, kterou formu
        tělo využije nejlépe.
      </p>
      {items.length === 0 && (
        <p className="text-muted text-[14px]">Pro tento orgán nemáme doporučení k doplňkům.</p>
      )}
      <ul className="space-y-3">
        {items.map((on) => {
          const a = ABSORPTION[on.id]!
          const best = a.forms.find((f) => f.rating === 'nejlepší') ?? a.forms[0]
          return (
            <li key={on.id} className="card p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[15.5px] font-medium">{NUTRIENTS[on.id].name}</p>
                <Link
                  href={supplementHref(on.id)}
                  className="link inline-flex items-center gap-1 text-[13px]"
                >
                  Detail <ArrowRight size={13} aria-hidden />
                </Link>
              </div>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-[14px]">
                <RatingBadge rating={best.rating} />
                {best.name}
              </p>
              <p className="text-muted mt-2 text-[13.5px]">{a.when}</p>
            </li>
          )
        })}
      </ul>
      <WhereToBuy links={links} title="Doporučené produkty" compact className="border-line border-t pt-5" />
    </div>
  )
}
