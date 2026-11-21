'use client'

import Link from '@/components/ui/Link'
import { useEffect, useState } from 'react'
import { BadgeCheck, CircleSlash } from 'lucide-react'
import { NUTRIENT_LIST, NUTRIENTS } from '@/data/nutrients'
import type { NutrientId, NutrientKind } from '@/data/types'
import { OrganLink } from '@/components/ui/OrganLink'
import { WhereToBuy } from '@/components/ui/WhereToBuy'
import { WHERE_TO_BUY } from '@/data/retailers'
import { ABSORPTION } from '@/data/absorption'
import { ReferenceValues } from '@/components/ui/ReferenceValues'
import { RatingBadge } from '@/components/ui/AbsorptionCard'
import {
  fmtAmount,
  organsForNutrient,
  pctRef,
  thresholdBasis,
  topFoodsFor,
  type Basis,
} from '@/lib/nutrition'
import { BasisToggle } from '@/components/food/BasisToggle'
import { cx } from '@/lib/format'
import { supplementHref } from '@/data/supplements'
import { portionText } from '@/lib/foods/query'
import { scrollBehavior } from '@/lib/motion'

const KINDS: (NutrientKind | 'Vše')[] = [
  'Vše',
  'Vitamín',
  'Minerální látka',
  'Mastná kyselina',
  'Bílkoviny a aminokyseliny',
  'Ostatní',
]

export function NutrientIndex() {
  const [kind, setKind] = useState<NutrientKind | 'Vše'>('Vše')
  const [active, setActive] = useState<NutrientId>('omega3')
  const list = kind === 'Vše' ? NUTRIENT_LIST : NUTRIENT_LIST.filter((n) => n.kind === kind)

  // deep links: /#nutrient-<id> (used by search and organ panels)
  useEffect(() => {
    const sync = () => {
      const m = window.location.hash.match(/^#nutrient-(\w+)$/)
      if (m && m[1] in NUTRIENTS) {
        setKind('Vše')
        setActive(m[1] as NutrientId)
        document.getElementById('nutrients')?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' })
      }
    }
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  const n = NUTRIENTS[active]
  const organs = organsForNutrient(active)
  const [per, setPer] = useState<Basis>('100g')
  const top = topFoodsFor(active, 6, per)

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div>
        <div
          className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0"
          role="group"
          aria-label="Filtrovat podle druhu"
        >
          {KINDS.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
              className="chip shrink-0"
            >
              {k}
            </button>
          ))}
        </div>
        <ul className="mt-4 grid grid-cols-1 gap-1 sm:grid-cols-2" aria-label="Živiny">
          {list.map((x) => (
            <li key={x.id} id={`nutrient-${x.id}`} className="scroll-mt-24">
              <button
                type="button"
                onClick={() => setActive(x.id)}
                aria-pressed={active === x.id}
                className={cx(
                  'flex w-full items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-left transition',
                  active === x.id
                    ? 'border-cyan/50 bg-cyan/[0.07]'
                    : 'border-transparent hover:bg-white/[0.03]',
                )}
              >
                <span className="text-[14.5px]">{x.name}</span>
                <span className="text-subtle font-mono text-[12px]">
                  orgány: {organsForNutrient(x.id).length}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <article className="card fade-up p-5 md:p-7" key={active} aria-live="polite">
        <p className="eyebrow">{n.kind}</p>
        <h3 className="display mt-2 text-[38px]">{n.name}</h3>
        <p className="text-fg/90 mt-2 text-[15px]">{n.blurb}</p>

        <ReferenceValues id={active} className="mt-5" />
        <p className="text-subtle mt-2 text-[12.5px]">
          Pravidlo „zdroj“ v tomto webu: {thresholdBasis(active)}
        </p>

        {ABSORPTION[active] && (
          <section className="mt-6">
            <h4 className="eyebrow mb-2.5">Nejlépe vstřebatelná forma</h4>
            <ul className="space-y-2">
              {ABSORPTION[active]!.forms.slice(0, 2).map((f) => (
                <li key={f.name} className="flex flex-wrap items-start gap-2 text-[14.5px]">
                  <RatingBadge rating={f.rating} />
                  <span>
                    <span className="font-medium">{f.name}</span>
                    <span className="text-muted"> — {f.note}</span>
                  </span>
                </li>
              ))}
            </ul>
            <Link href={supplementHref(active)} className="link mt-2 inline-block text-[13.5px]">
              Všechny formy, dávky a tipy →
            </Link>
          </section>
        )}

        <section className="mt-6">
          <h4 className="eyebrow mb-2.5">Zdravotní tvrzení schválená EU</h4>
          {n.functions.length ? (
            <ul className="space-y-1.5">
              {n.functions.map((f) => (
                <li key={f} className="flex gap-2 text-[14.5px]">
                  <BadgeCheck size={16} className="text-cyan mt-0.5 shrink-0" aria-hidden />
                  {f}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-warn flex gap-2 text-[14.5px]">
              <CircleSlash size={16} className="mt-0.5 shrink-0" aria-hidden />
              Pro tuto živinu ({n.name.toLowerCase()}) neexistuje zdravotní tvrzení schválené EU.
            </p>
          )}
        </section>

        <section className="mt-6">
          <h4 className="eyebrow mb-2.5">Orgány v modelu</h4>
          <ul className="flex flex-wrap gap-2">
            {organs.map((o) => (
              <li key={o.id}>
                <OrganLink id={o.id} />
              </li>
            ))}
          </ul>
          <p className="text-subtle mt-2 text-[12.5px]">
            Uvedené orgány jsou příklady — většinu živin využívá každá buňka.
          </p>
        </section>

        {active !== 'water' && top.length > 0 && (
          <section className="mt-6">
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
              <h4 className="eyebrow">Nejlepší zdroje · {per === 'portion' ? 'na porci' : 'na 100 g'}</h4>
              {!n.qualitative && <BasisToggle value={per} onChange={setPer} />}
            </div>
            <ul className="divide-line divide-y">
              {top.map(({ food, v }) => {
                const p = pctRef(active, v)
                return (
                  <li key={food.id}>
                    <Link
                      href={`/food/${food.id}`}
                      className="hover:text-cyan flex items-center justify-between gap-3 py-2"
                    >
                      <span className="text-[14.5px]">
                        {food.name}
                        {per === 'portion' && (
                          <span className="text-subtle ml-1.5 text-[12px]">
                            ({portionText(food.portion)})
                          </span>
                        )}
                      </span>
                      {!n.qualitative && (
                        <span className="text-muted font-mono text-[13px]">
                          {fmtAmount(v, n.unit)}
                          {p !== undefined && <span className="text-cyan ml-2">{p}%</span>}
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        )}
        <WhereToBuy links={WHERE_TO_BUY[active]} className="border-line mt-6 border-t pt-5" />
      </article>
    </div>
  )
}
