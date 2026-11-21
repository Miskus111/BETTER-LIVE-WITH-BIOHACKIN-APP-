import Link from '@/components/ui/Link'
import { ArrowRight } from 'lucide-react'
import { NUTRIENTS } from '@/data/nutrients'
import { WHERE_TO_BUY } from '@/data/retailers'
import { supplementHref } from '@/data/supplements'
import type { NutrientId } from '@/data/types'
import { AbsorptionCard } from '@/components/ui/AbsorptionCard'
import { ReferenceValues } from '@/components/ui/ReferenceValues'
import { WhereToBuy } from '@/components/ui/WhereToBuy'
import { organsForNutrient, topFoodsFor, fmtAmount } from '@/lib/nutrition'

/**
 * One nutrient's supplement guide: reference values, absorption by form, best food sources and
 * where to buy. Used as a card on /doplnky and as the body of /doplnky/[slug].
 */
export function NutrientGuide({ id, standalone = false }: { id: NutrientId; standalone?: boolean }) {
  const n = NUTRIENTS[id]
  const foods = topFoodsFor(id, standalone ? 8 : 4)
  const organs = organsForNutrient(id)
  return (
    <section
      id={standalone ? undefined : id}
      aria-labelledby={standalone ? undefined : `${id}-h`}
      className={standalone ? '' : 'card scroll-mt-24 p-5 md:p-8'}
    >
      {!standalone && (
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="eyebrow">{n.kind}</p>
            <h2 id={`${id}-h`} className="display mt-2 text-[36px] md:text-[44px]">
              {n.name}
            </h2>
          </div>
          <OrganChips id={id} />
        </div>
      )}
      {!standalone && <p className="text-muted mt-2 max-w-3xl text-[15px]">{n.blurb}</p>}

      <ReferenceValues id={id} className="mt-5" />

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <AbsorptionCard id={id} hideWhen={standalone} />
        <div className="space-y-6">
          {!n.qualitative && foods.length > 0 && (
            <div>
              <p className="eyebrow mb-2.5">Nejlepší zdroje v jídle · na 100 g</p>
              <ul className="divide-line divide-y">
                {foods.map(({ food, v }) => (
                  <li key={food.id}>
                    <Link
                      href={`/food/${food.id}`}
                      className="hover:text-cyan flex justify-between gap-3 py-1.5 text-[14px]"
                    >
                      {food.name}
                      <span className="text-muted font-mono text-[13px]">{fmtAmount(v, n.unit)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <WhereToBuy links={WHERE_TO_BUY[id]} title="Doporučené produkty" compact />
        </div>
      </div>

      {!standalone && (
        <Link href={supplementHref(id)} className="link mt-6 inline-flex items-center gap-1 text-[14px]">
          Celý průvodce: {n.name} <ArrowRight size={14} aria-hidden />
        </Link>
      )}
      {standalone && organs.length > 0 && (
        <div className="mt-8">
          <p className="eyebrow mb-2.5">Pro které orgány je důležitý</p>
          <OrganChips id={id} />
        </div>
      )}
    </section>
  )
}

export function OrganChips({ id }: { id: NutrientId }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {organsForNutrient(id).map((o) => (
        <Link key={o.id} href={`/organ/${o.id}`} className="chip !py-1 !text-[12.5px]">
          <span className="h-2 w-2 rounded-full" style={{ background: o.accent }} aria-hidden />
          {o.shortName}
        </Link>
      ))}
    </div>
  )
}
