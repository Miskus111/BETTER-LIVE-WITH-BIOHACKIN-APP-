'use client'

import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { useMemo, useState, useTransition } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { FOODS, foodById } from '@/data/foods'
import { matchesText } from '@/lib/foods/query'
import { NUTRIENTS } from '@/data/nutrients'
import type { NutrientId } from '@/data/types'
import { createClient } from '@/lib/supabase/client'
import { cx } from '@/lib/format'
import { conflictsFor, type Conflict, type DietProfile } from '@/lib/eat/conflicts'

/** daily targets that differ from the label NRV (EFSA adequate intake for adults) */
const DIARY_TARGET: Partial<Record<NutrientId, number>> = { vitD: 15 }

export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export interface LogRow {
  id: string
  meal: Meal
  title: string
  grams: number
  kcal: number
  protein_g: number
  fat_g: number
  carbs_g: number
  fiber_g: number
  food_slug?: string | null
}
const MEALS: Meal[] = ['breakfast', 'lunch', 'dinner', 'snack']
type Db = { from: (t: string) => any } // eslint-disable-line @typescript-eslint/no-explicit-any

const NO_PROFILE: DietProfile = { diet: null, allergies: [], dislikes: [] }

export function FoodDiary({
  rows,
  day,
  profile = NO_PROFILE,
}: {
  rows: LogRow[]
  day: string
  /** allergies, diet and dislikes from onboarding: matching foods get a warning and go last */
  profile?: DietProfile
}) {
  const t = useTranslations('eat')
  const opt = useTranslations('onboarding.options')
  const locale = useLocale()
  const router = useRouter()
  const [open, setOpen] = useState<Meal | null>(null)
  const [q, setQ] = useState('')
  // empty = the food's default household portion
  const [grams, setGrams] = useState('')
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const results = useMemo(
    () =>
      FOODS.filter((f) => matchesText(f, q))
        .map((f) => ({ f, conflicts: conflictsFor(f, profile) }))
        // foods that clash with the profile last; dry rice, pasta and pulses (rarely eaten as such) after ready-to-eat
        .sort(
          (a, b) =>
            Number(a.conflicts.length > 0) - Number(b.conflicts.length > 0) ||
            Number(a.f.state === 'dry') - Number(b.f.state === 'dry'),
        )
        .slice(0, 8),
    [q, profile],
  )

  const conflictText = (c: Conflict) =>
    c.kind === 'allergy'
      ? t('conflictAllergy', { what: opt(`allergies.${c.allergy}` as 'allergies.gluten') })
      : c.kind === 'diet'
        ? t('conflictDiet', { what: opt(`diet.${c.diet}` as 'diet.vegan').toLowerCase() })
        : t('conflictDislike', { what: c.word })

  const add = (meal: Meal, slug: string) =>
    start(async () => {
      const f = FOODS.find((x) => x.id === slug)!
      const g = grams.trim() ? Number(grams.replace(',', '.')) : f.portion.grams
      if (!(g > 0)) return
      const k = g / 100
      const db = createClient() as unknown as Db
      const { error: err } = await db.from('food_logs').insert({
        client_id: crypto.randomUUID(),
        logged_on: day,
        meal,
        title: `${f.name}|${slug}`,
        grams: g,
        kcal: Math.round(f.kcal * k),
        protein_g: +(f.macros.protein * k).toFixed(1),
        fat_g: +(f.macros.fat * k).toFixed(1),
        carbs_g: +(f.macros.carbs * k).toFixed(1),
        fiber_g: +(f.macros.fiber * k).toFixed(1),
      })
      if (err) {
        console.error('[eat] insert failed', err.message)
        setError(t('saveError'))
      } else {
        setOpen(null)
        setQ('')
        router.refresh()
      }
    })

  const remove = (id: string) =>
    start(async () => {
      const db = createClient() as unknown as Db
      await db.from('food_logs').delete().eq('id', id)
      router.refresh()
    })

  // micronutrient coverage from logged USDA foods: % of the label NRV, except vitamin D, whose legal NRV
  // (5 µg) is far below the EFSA adequate intake for adults (15 µg) and would read as 300 % "covered"
  const micros = useMemo(() => {
    const sum: Partial<Record<NutrientId, number>> = {}
    for (const r of rows) {
      const slug = r.title.split('|')[1]
      const f = foodById(slug)
      if (!f) continue
      for (const [id, v] of Object.entries(f.micros) as [NutrientId, number][])
        sum[id] = (sum[id] ?? 0) + (v * r.grams) / 100
    }
    return (Object.entries(sum) as [NutrientId, number][])
      .filter(([id]) => NUTRIENTS[id].ref?.kind === 'RHP')
      .map(([id, v]) => ({ id, pct: Math.round((v / (DIARY_TARGET[id] ?? NUTRIENTS[id].ref!.value)) * 100) }))
      .sort((a, b) => b.pct - a.pct)
  }, [rows])

  return (
    <div className="space-y-4">
      {MEALS.map((meal) => {
        const items = rows.filter((r) => r.meal === meal)
        const kcal = items.reduce((s, r) => s + Number(r.kcal), 0)
        return (
          <section key={meal} className="card p-4" data-testid={`meal-${meal}`}>
            <div className="flex items-center justify-between">
              <h3 className="text-[16px] font-medium">{t(meal)}</h3>
              <span className="text-subtle font-mono text-[13px]">{Math.round(kcal)} kcal</span>
            </div>
            <ul className="mt-2">
              {items.length === 0 && <li className="text-subtle text-[14px]">{t('empty')}</li>}
              {items.map((r) => (
                <li
                  key={r.id}
                  className="border-line flex items-center justify-between gap-3 border-t py-2 first:border-t-0"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[14.5px]">{r.title.split('|')[0]}</span>
                    <span className="text-subtle block font-mono text-[12.5px]">
                      {Number(r.grams)} g · {Math.round(Number(r.kcal))} kcal ·{' '}
                      {Number(r.protein_g).toLocaleString(locale === 'en' ? 'en' : 'cs-CZ', {
                        maximumFractionDigits: 1,
                      })}{' '}
                      g {t('proteinShort')}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center">
                    <button
                      type="button"
                      aria-label={t('deleteEntry')}
                      onClick={() => remove(r.id)}
                      className="text-subtle p-1 hover:text-[#ff9b9b]"
                    >
                      <Trash2 size={15} />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
            {open === meal ? (
              <div className="border-line mt-3 rounded-xl border p-3">
                <div className="flex gap-2">
                  <input
                    autoFocus
                    className="field flex-1 !py-2"
                    placeholder={t('searchFood')}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                  <input
                    aria-label={t('grams')}
                    placeholder="porce g"
                    className="field !w-24 !py-2 text-center"
                    inputMode="decimal"
                    value={grams}
                    onChange={(e) => setGrams(e.target.value)}
                  />
                </div>
                <ul className="mt-2 max-h-64 overflow-y-auto">
                  {results.map(({ f, conflicts }) => (
                    <li key={f.id}>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => add(meal, f.id)}
                        className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left hover:bg-white/[0.05]"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[14.5px]">{f.name}</span>
                          <span className="text-subtle block truncate text-[12px]">{f.basis}</span>
                          {conflicts.length > 0 && (
                            <span
                              className="text-warn block text-[12px]"
                              title={t('conflictNote')}
                              data-testid="diary-conflict"
                            >
                              {conflicts.map(conflictText).join(' · ')}
                            </span>
                          )}
                        </span>
                        <span className="text-subtle shrink-0 text-right font-mono text-[12px]">
                          {grams.trim()
                            ? `${f.kcal} kcal / 100 g`
                            : `${f.portion.label} · ${Math.round((f.kcal * f.portion.grams) / 100)} kcal`}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                {error && <p className="mt-2 text-[13px] text-[#ff9b9b]">{error}</p>}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setOpen(meal)}
                className="link mt-2 inline-flex items-center gap-1 text-[14px]"
              >
                <Plus size={14} aria-hidden /> {t('addFood')}
              </button>
            )}
          </section>
        )
      })}

      {micros.length > 0 && (
        <section className="card p-4">
          <h3 className="eyebrow mb-3">{t('micros')}</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {micros.map((m) => (
              <li key={m.id}>
                <div className="flex justify-between text-[14px]">
                  <span>{NUTRIENTS[m.id].name}</span>
                  <span className={cx('font-mono text-[13px]', m.pct >= 100 ? 'text-bio' : 'text-muted')}>
                    {m.pct} %
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-white/[0.06]">
                  <div
                    className={cx('h-full rounded-full', m.pct >= 100 ? 'bg-bio' : 'bg-cyan')}
                    style={{ width: `${Math.min(100, m.pct)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <p className="text-subtle mt-2 text-[12px]">
            {locale === 'cs'
              ? 'Jen z potravin z databáze USDA. Procenta jsou z RHP jako na etiketách; vitamín D se měří k 15 µg podle EFSA — zákonná RHP (5 µg) je pro dospělé zastaralá.'
              : 'From USDA-database foods only. Percentages use the label NRV; vitamin D is measured against the EFSA 15 µg — the legal NRV (5 µg) is outdated for adults.'}
          </p>
        </section>
      )}
    </div>
  )
}
