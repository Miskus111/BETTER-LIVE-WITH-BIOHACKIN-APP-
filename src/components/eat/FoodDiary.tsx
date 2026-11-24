'use client'

import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { FOODS, foodById } from '@/data/foods'
import { foodTypoFix, matchesText } from '@/lib/foods/query'
import { recentFoods } from '@/lib/eat/recent'
import { NUTRIENTS } from '@/data/nutrients'
import { PANEL_BY_KEY } from '@/lib/foods/panel'
import type { NutrientId } from '@/data/types'
import { createClient } from '@/lib/supabase/client'
import { useSafeTransition } from '@/lib/useSafeTransition'
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

/** The meal a food logged right now most likely belongs to, by the hour in Prague (servers run on UTC). */
export function mealNow(d: Date): Meal {
  const h = Number(
    new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Europe/Prague' }).format(
      d,
    ),
  )
  return h < 10 ? 'breakfast' : h < 15 ? 'lunch' : h >= 17 && h < 21 ? 'dinner' : 'snack'
}
type Db = { from: (t: string) => any } // eslint-disable-line @typescript-eslint/no-explicit-any

const NO_PROFILE: DietProfile = { diet: null, allergies: [], dislikes: [] }
const NO_HISTORY: { logged_on: string; meal: string; title: string; grams: number }[] = []

export function FoodDiary({
  rows,
  day,
  profile = NO_PROFILE,
  prefill,
  history = NO_HISTORY,
}: {
  rows: LogRow[]
  day: string
  /** the past week's entries: the foods logged most often there are offered for one-tap logging */
  history?: { logged_on: string; meal: string; title: string; grams: number | string }[]
  /** allergies, diet and dislikes from onboarding: matching foods get a warning and go last */
  profile?: DietProfile
  /** open this meal with the search already filled in (link from the website) */
  prefill?: { name: string; meal: Meal }
}) {
  const t = useTranslations('eat')
  const opt = useTranslations('onboarding.options')
  const locale = useLocale()
  const en = locale === 'en'
  // foods and nutrients have English names in the data; logged entries keep the Czech title plus the food id
  const foodName = (f: { name: string; nameEn: string }) => (en ? f.nameEn || f.name : f.name)
  const rowName = (title: string) => {
    const [name, slug] = title.split('|')
    const f = en && slug ? foodById(slug) : undefined
    return f ? foodName(f) : name
  }
  const nutrientName = (id: NutrientId) =>
    en ? ((PANEL_BY_KEY as Record<string, { en: string }>)[id]?.en ?? NUTRIENTS[id].name) : NUTRIENTS[id].name
  const router = useRouter()
  const [open, setOpen] = useState<Meal | null>(prefill?.meal ?? null)
  const [q, setQ] = useState(prefill?.name ?? '')
  // empty = the food's default household portion
  const [grams, setGrams] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useSafeTransition(() => setError(t('saveError')))

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
  // the open meal's usual foods from the past week, for one-tap logging
  const recent = useMemo(
    () =>
      open
        ? recentFoods(history, open, (id) => !!foodById(id)).map((r) => ({
            food: foodById(r.id)!,
            grams: r.grams,
          }))
        : [],
    [history, open],
  )
  // a search with no results gets a typo fix to try ("jogrt" → jogurt)
  const typoFix = useMemo(
    () => (results.length || !q.trim() ? undefined : foodTypoFix(FOODS, q)),
    [results, q],
  )

  const conflictText = (c: Conflict) =>
    c.kind === 'allergy'
      ? t('conflictAllergy', { what: opt(`allergies.${c.allergy}` as 'allergies.gluten') })
      : c.kind === 'diet'
        ? t('conflictDiet', { what: opt(`diet.${c.diet}` as 'diet.vegan').toLowerCase() })
        : t('conflictDislike', { what: c.word })

  const add = (meal: Meal, slug: string, usual?: number) =>
    start(async () => {
      const f = FOODS.find((x) => x.id === slug)!
      // typed grams win; then the amount used last time (recent foods); then the food's household portion
      const g = grams.trim() ? Number(grams.replace(',', '.')) : (usual ?? f.portion.grams)
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

  const remove = (r: LogRow) =>
    start(async () => {
      const db = createClient() as unknown as Db
      const { error: err } = await db.from('food_logs').delete().eq('id', r.id)
      if (err) {
        console.error('[eat] delete failed', err.message)
        setError(t('deleteError'))
        return
      }
      setDeleted(r)
      router.refresh()
    })

  // a deleted entry can be put back for a few seconds (a stray tap on the bin icon)
  const [deleted, setDeleted] = useState<LogRow | null>(null)
  useEffect(() => {
    if (!deleted) return
    const timer = setTimeout(() => setDeleted(null), 8000)
    return () => clearTimeout(timer)
  }, [deleted])
  const undo = (r: LogRow) =>
    start(async () => {
      const db = createClient() as unknown as Db
      const { error: err } = await db.from('food_logs').insert({
        client_id: crypto.randomUUID(),
        logged_on: day,
        meal: r.meal,
        title: r.title,
        grams: r.grams,
        kcal: r.kcal,
        protein_g: r.protein_g,
        fat_g: r.fat_g,
        carbs_g: r.carbs_g,
        fiber_g: r.fiber_g,
      })
      if (err) {
        console.error('[eat] undo failed', err.message)
        setError(t('saveError'))
        return
      }
      setDeleted(null)
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
      {deleted && (
        <div
          role="status"
          data-testid="diary-undo"
          className="card flex items-center justify-between gap-3 px-4 py-2.5 text-[14px]"
        >
          <span className="text-muted min-w-0 truncate">
            {t('deleted', { name: rowName(deleted.title) })}
          </span>
          <button type="button" className="link shrink-0" disabled={pending} onClick={() => undo(deleted)}>
            {t('undo')}
          </button>
        </div>
      )}
      {error && !open && (
        <p role="alert" className="text-[13px] text-[#ff9b9b]">
          {error}
        </p>
      )}
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
                    <span className="block truncate text-[14.5px]">{rowName(r.title)}</span>
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
                      onClick={() => remove(r)}
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
                {!q.trim() && recent.length > 0 && (
                  <div className="mt-3" data-testid="diary-recent">
                    <p className="text-subtle px-2 text-[12px] tracking-wider uppercase">{t('recent')}</p>
                    <ul className="mt-1.5 flex flex-wrap gap-1.5 px-1">
                      {recent.map(({ food: f, grams: usual }) => (
                        <li key={f.id}>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => add(meal, f.id, usual)}
                            className="chip hover:bg-white/[0.08]"
                            aria-label={t('recentAdd', { name: foodName(f), grams: usual })}
                          >
                            {foodName(f)} · {usual} g
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {q.trim() && results.length === 0 && (
                  <p
                    className="text-subtle mt-3 px-2 text-[13.5px]"
                    role="status"
                    data-testid="diary-no-food"
                  >
                    {t('noFood')}{' '}
                    {typoFix && (
                      <button type="button" className="link" onClick={() => setQ(typoFix)}>
                        {t('didYouMean', { fix: typoFix })}
                      </button>
                    )}
                  </p>
                )}
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
                          <span className="block truncate text-[14.5px]">{foodName(f)}</span>
                          {!en && <span className="text-subtle block truncate text-[12px]">{f.basis}</span>}
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
                  <span>{nutrientName(m.id)}</span>
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
