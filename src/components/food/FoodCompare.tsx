import Link from '@/components/ui/Link'
import type { Food } from '@/data/types'
import { MEASURES, measureOf, portionText } from '@/lib/foods/query'
import { fmtAmount, pctRef } from '@/lib/nutrition'
import type { NutrientId } from '@/data/types'

/** Side-by-side table of up to three foods, per 100 g or per each food's default portion. */
export function FoodCompare({ foods, per }: { foods: Food[]; per: '100g' | 'portion' }) {
  const factor = (f: Food) => (per === 'portion' ? f.portion.grams / 100 : 1)
  // only rows where at least one food has a value
  const rows = MEASURES.filter((m) => foods.some((f) => measureOf(f, m.id) !== undefined))
  return (
    <div className="card mt-3 overflow-x-auto p-0" data-testid="food-compare">
      <table className="w-full min-w-[520px] text-[13.5px]">
        <thead>
          <tr className="border-line border-b text-left">
            <th className="text-subtle p-3 font-normal">Na {per === 'portion' ? 'porci' : '100 g'}</th>
            {foods.map((f) => (
              <th key={f.id} className="p-3 align-bottom font-medium">
                <Link href={`/food/${f.id}`} className="link">
                  {f.name}
                </Link>
                <span className="text-subtle block font-mono text-[11.5px] font-normal">
                  {per === 'portion' ? portionText(f.portion) : f.basis}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => {
            const vals = foods.map((f) => {
              const v = measureOf(f, m.id)
              return v === undefined ? undefined : v * factor(f)
            })
            const best = Math.max(...vals.map((v) => v ?? -1))
            return (
              <tr key={m.id} className="border-line/60 border-b last:border-0">
                <th scope="row" className="text-muted p-3 text-left font-normal">
                  {m.label}
                </th>
                {vals.map((v, i) => {
                  const pct =
                    v !== undefined && !['kcal', 'fat', 'carbs'].includes(m.id)
                      ? pctRef(m.id as NutrientId, v)
                      : undefined
                  return (
                    <td
                      key={foods[i].id}
                      className={`p-3 font-mono ${v !== undefined && v === best && foods.length > 1 ? 'text-cyan' : ''}`}
                    >
                      {v === undefined ? (
                        <span className="text-subtle">bez údajů</span>
                      ) : (
                        fmtAmount(v, m.unit)
                      )}
                      {pct !== undefined && <span className="text-subtle"> · {pct} %</span>}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="text-subtle border-line border-t p-3 text-[12px]">
        Procenta = podíl referenční hodnoty příjmu (RHP) EU. Zdroj: USDA FoodData Central.
      </p>
    </div>
  )
}
