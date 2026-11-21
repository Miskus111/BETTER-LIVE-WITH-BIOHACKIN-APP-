import Link from '@/components/ui/Link'
import { ArrowUpRight, Info, Microscope, Waves } from 'lucide-react'
import { NUTRIENTS } from '@/data/nutrients'
import type { Food, NutrientId } from '@/data/types'
import { Thumb } from '@/components/ui/Thumb'
import { NrvBar } from '@/components/ui/NrvBar'
import { OrganLink } from '@/components/ui/OrganLink'
import { notRecommendedReason, organsForFood, pctRef } from '@/lib/nutrition'
import { shortNutrient } from '@/lib/format'
import { ALLERGEN_CS, portionText } from '@/lib/foods/query'
import { foodSummary } from '@/lib/foods/summary'
import { Rhp } from '@/components/ui/Rhp'
import { MacroSplitBar } from './MacroSplitBar'

/** Full food detail — used in the homepage explorer and on /food/[id]. */
export function FoodDetail({
  food,
  headingLevel = 'h3',
  showPageLink,
  afterSummary,
}: {
  food: Food
  headingLevel?: 'h1' | 'h3'
  showPageLink?: boolean
  /** shown right under "V kostce" — the food page puts safety warnings (upper limits) here */
  afterSummary?: React.ReactNode
}) {
  const H = headingLevel
  const micros = (Object.entries(food.micros) as [NutrientId, number][])
    .filter(([id]) => NUTRIENTS[id])
    .sort((a, b) => (pctRef(b[0], b[1]) ?? 0) - (pctRef(a[0], a[1]) ?? 0))
  const organs = organsForFood(food)
  const notRecommended = notRecommendedReason(food)
  const summary = foodSummary(food)
  // UK FSA 'high' salt: more than 1.5 g per 100 g
  const salty = food.sodiumMg !== undefined && (food.sodiumMg * 2.5) / 1000 > 1.5

  return (
    <article className="grid grid-cols-1 gap-6" data-testid="food-detail">
      <div className="grid gap-5 sm:grid-cols-[200px_1fr] sm:items-start">
        <Thumb src={food.image} alt={`${food.name} (ilustrační obrázek)`} className="rounded-2xl" />
        <div>
          <p className="eyebrow">{food.category}</p>
          <H className="display mt-2 text-[36px] md:text-[42px]">{food.name}</H>
          <p className="text-muted mt-1 font-mono text-[13px]">Na 100 g · {food.basis}</p>
          <p className="text-subtle mt-1 text-[13px]">
            Běžná porce: {portionText(food.portion)} = {Math.round((food.kcal * food.portion.grams) / 100)}{' '}
            kcal
          </p>
          {food.recipe && <p className="chip mt-2 inline-flex text-[12px]">Vypočtený recept ze surovin</p>}
          {showPageLink && (
            <Link
              href={`/food/${food.id}`}
              className="link mt-2 inline-flex items-center gap-1 text-[13.5px]"
            >
              Otevřít stránku potraviny <ArrowUpRight size={13} aria-hidden />
            </Link>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {[
          ['kcal', food.kcal, ''],
          ['Bílkoviny', food.macros.protein, 'g'],
          ['Tuky', food.macros.fat, 'g'],
          ['Sacharidy', food.macros.carbs, 'g'],
          ['Vláknina', food.macros.fiber, 'g'],
        ].map(([k, v, u]) => (
          <div key={k as string} className="border-line rounded-xl border p-2.5 text-center">
            <dt className="text-subtle font-mono text-[12px]">{k}</dt>
            <dd className="mt-0.5 text-[16px] font-medium">
              {String(v).replace('.', ',')}
              <span className="text-muted text-[12px]">{u && ` ${u}`}</span>
            </dd>
          </div>
        ))}
      </dl>

      <MacroSplitBar macros={food.macros} />

      {summary.length > 0 && (
        <section aria-labelledby={`summary-${food.id}`} data-testid="food-summary">
          <h2 id={`summary-${food.id}`} className="eyebrow mb-2">
            V kostce
          </h2>
          <ul className="grid gap-1.5 text-[14.5px] leading-snug">
            {summary.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="bg-cyan mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full" aria-hidden />
                {line}
              </li>
            ))}
          </ul>
          <p className="text-subtle mt-2 text-[12px]">
            Vypočteno z hodnot na {food.liquid ? '100 ml' : '100 g'} podle prahů výživových tvrzení EU
            (nařízení 1924/2006); vysoký obsah cukrů, tuků a soli podle semaforu britské FSA.
          </p>
        </section>
      )}

      {afterSummary}

      {food.allergens.length > 0 && (
        <p className="text-[13.5px]" data-testid="food-allergens">
          <span className="text-subtle">Alergeny (EU): </span>
          {food.allergens.map((a) => ALLERGEN_CS[a] ?? a).join(', ')}
        </p>
      )}

      {(food.liveCultures || salty || food.note) && (
        <ul className="grid grid-cols-1 gap-2">
          {food.liveCultures && (
            <Note icon={<Microscope size={15} />}>
              Obsahuje živé kultury, pokud nebyl po fermentaci tepelně ošetřen. Pasterované nebo trvanlivé
              verze je neobsahují.
            </Note>
          )}
          {salty && (
            <Note icon={<Waves size={15} />} tone="warn">
              Vysoký obsah soli: {((food.sodiumMg! * 2.5) / 1000).toFixed(1).replace('.', ',')} g na 100 g
              (sodík {food.sodiumMg} mg). Doporučený denní limit WHO je 5 g soli — záleží na velikosti porce.
            </Note>
          )}
          {food.note && <Note icon={<Info size={15} />}>{food.note}</Note>}
        </ul>
      )}

      {micros.length > 0 && (
        <section>
          <h2 className="eyebrow mb-3">Vitamíny, minerály a další · % denní referenční hodnoty</h2>
          <div className="grid gap-3.5 sm:grid-cols-2 sm:gap-x-6">
            {micros.map(([id, v]) => (
              <NrvBar key={id} id={id} value={v} />
            ))}
          </div>
          <p className="text-subtle mt-3 text-[12.5px]">
            Zvýrazněné hodnoty dosahují úrovně „zdroj“ podle EU ( ≥ {food.liquid ? '7,5' : '15'} % <Rhp /> na{' '}
            {food.liquid ? '100 ml' : '100 g'}). Zdroj: {food.fdc}.
          </p>
        </section>
      )}

      <section>
        <h2 className="eyebrow mb-3">Související orgány</h2>
        {notRecommended && organs.length ? (
          <div data-testid="not-recommended">
            <p className="text-muted text-[14px]">
              Na 100 g splňuje práh „zdroj“ pro:{' '}
              {[...new Set(organs.flatMap((o) => o.via))]
                .map((v) => shortNutrient(NUTRIENTS[v].name))
                .map((n) => n.charAt(0).toLowerCase() + n.slice(1))
                .join(', ')}
              . Jako zdroj živin to přesto nedoporučujeme ({notRecommended}). Lepší zdroje najdete u orgánů:
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {organs.slice(0, 4).map((o) => (
                <li key={o.organ.id}>
                  <OrganLink id={o.organ.id} />
                </li>
              ))}
            </ul>
          </div>
        ) : organs.length ? (
          <ul className="flex flex-wrap gap-2">
            {organs.map(({ organ, via }) => (
              <li key={organ.id}>
                <OrganLink
                  id={organ.id}
                  detail={via.map((v) => shortNutrient(NUTRIENTS[v].name)).join(', ')}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted text-[14px]">
            100 g nedosáhne úrovně „zdroj“ u žádné živiny v modelu orgánů. To nic neříká o tom, zda potravina
            patří do pestré stravy.
          </p>
        )}
      </section>
    </article>
  )
}

function Note({ icon, children, tone }: { icon: React.ReactNode; children: React.ReactNode; tone?: 'warn' }) {
  return (
    <li
      className={`flex gap-2.5 rounded-xl border p-3 text-[14px] ${tone === 'warn' ? 'border-warn/25 bg-warn/[0.05]' : 'border-line bg-white/[0.02]'}`}
    >
      <span className={`mt-0.5 shrink-0 ${tone === 'warn' ? 'text-warn' : 'text-cyan'}`} aria-hidden>
        {icon}
      </span>
      <span className="text-fg/90">{children}</span>
    </li>
  )
}
