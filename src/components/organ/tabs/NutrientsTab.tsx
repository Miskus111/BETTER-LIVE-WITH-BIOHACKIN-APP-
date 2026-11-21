import Link from '@/components/ui/Link'
import { NUTRIENTS } from '@/data/nutrients'
import type { Organ } from '@/data/types'
import { EvidenceBadge } from '@/components/ui/EvidenceBadge'
import { fmtAmount, pctRef, topFoodsFor } from '@/lib/nutrition'

export function NutrientsTab({ organ }: { organ: Organ }) {
  return (
    <ul className="space-y-4" data-testid="organ-nutrients">
      {organ.nutrients.map((on) => {
        const n = NUTRIENTS[on.id]
        const top = topFoodsFor(on.id, 3)
        return (
          <li key={on.id} id={`${organ.id}-n-${on.id}`} className="card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <Link href={`/#nutrient-${n.id}`} className="hover:text-cyan text-[16px] font-medium">
                  {n.name}
                </Link>
                <p className="text-subtle font-mono text-[12px]">
                  {n.kind}
                  {on.relation === 'handles' && ' · tento orgán ji zpracovává'}
                </p>
              </div>
              <EvidenceBadge level={on.level} />
            </div>
            <p className="text-fg/90 mt-2.5 text-[14.5px]">{on.role}</p>
            {n.functions.length === 0 && (
              <p className="text-warn/90 mt-2 text-[13px]">
                Pro tuto živinu neexistuje zdravotní tvrzení schválené EU.
              </p>
            )}
            {top.length > 0 && on.id !== 'water' && (
              <div className="border-line mt-3 border-t pt-3">
                <p className="text-subtle mb-2 font-mono text-[12px] tracking-wider uppercase">
                  Nejlepší zdroje · na 100 g
                </p>
                <ul className="flex flex-wrap gap-2">
                  {top.map(({ food, v }) => {
                    const p = pctRef(on.id, v)
                    return (
                      <li key={food.id}>
                        <Link href={`/food/${food.id}`} className="chip">
                          {food.name}
                          {!n.qualitative && (
                            <span className="text-cyan font-mono text-[12px]">
                              {fmtAmount(v, n.unit)}
                              {p !== undefined && ` · ${p}%`}
                            </span>
                          )}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
            {on.id === 'water' && (
              <p className="text-subtle mt-3 text-[13px]">
                Většinu vody dodávají nápoje; potraviny jako ovoce, zelenina a polévky přidají zhruba pětinu.
              </p>
            )}
          </li>
        )
      })}
    </ul>
  )
}
