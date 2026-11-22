'use client'

import { useSafeTransition } from '@/lib/useSafeTransition'

import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { ChevronDown, Trash2 } from 'lucide-react'
import {
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { deleteMeasurement, saveMeasurement, type MeasurementInput } from '@/app/(app)/body/weight/actions'
import { trendChange, weeklyRate, withTrend, type TrendPoint } from '@/lib/body/weight'
import { niceAxis } from '@/lib/train/progress'
import { Stat } from '@/components/train/ProgressCharts'
import { cx } from '@/lib/format'

const TREND = '#5ee7ff'
const DAILY = '#7f8e9c'
const AXIS = '#7f8e9c'
const GRID = 'rgba(255,255,255,0.06)'

export interface MeasurementRow {
  id: string
  measured_at: string
  weight_kg: number | null
  waist_cm: number | null
  hips_cm: number | null
  chest_cm: number | null
  arm_cm: number | null
  thigh_cm: number | null
}

const EXTRA = ['hips_cm', 'chest_cm', 'arm_cm', 'thigh_cm'] as const
const RANGES = [30, 90, 365] as const

const num = (v: FormDataEntryValue | null) => {
  const s = String(v ?? '')
    .trim()
    .replace(',', '.')
  return s === '' ? null : Number(s)
}

export function WeightTracker({
  rows,
  today,
  goal,
}: {
  rows: MeasurementRow[]
  today: string
  goal: 'lose' | 'gain' | 'keep'
}) {
  const t = useTranslations('weight')
  const locale = useLocale()
  const router = useRouter()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, start] = useSafeTransition(() => setMsg({ ok: false, text: t('error') }))
  const [more, setMore] = useState(false)
  const [range, setRange] = useState<(typeof RANGES)[number]>(90)

  const nf = useMemo(
    () => new Intl.NumberFormat(locale === 'en' ? 'en' : 'cs-CZ', { maximumFractionDigits: 1 }),
    [locale],
  )
  const df = (iso: string, long = false) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString(
      locale === 'en' ? 'en-GB' : 'cs-CZ',
      long ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'numeric' },
    )

  const all = useMemo(
    () =>
      withTrend(
        rows
          .filter((r) => r.weight_kg !== null)
          .map((r) => ({ date: r.measured_at, weightKg: Number(r.weight_kg) })),
      ),
    [rows],
  )
  const from = new Date(Date.parse(`${today}T00:00:00Z`) - range * 864e5).toISOString().slice(0, 10)
  const shown = all.filter((p) => p.date >= from)
  const waist = rows
    .filter((r) => r.waist_cm !== null && r.measured_at >= from)
    .map((r) => ({ date: r.measured_at, waist: Number(r.waist_cm) }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const last = all[all.length - 1]
  const ch30 = trendChange(all, 30)
  const rate = weeklyRate(all, 28)
  const total = all.length > 1 ? Math.round((last.trend - all[0].trend) * 10) / 10 : null
  const yW = niceAxis(
    shown.flatMap((p) => [p.weightKg, p.trend]),
    0.005,
  )
  const yWaist = niceAxis(
    waist.map((w) => w.waist),
    0.005,
  )
  const latestRow = [...rows].sort((a, b) => b.measured_at.localeCompare(a.measured_at))[0]

  // direction that counts as progress for this user's goal
  const tone = (v: number | null) =>
    v === null || v === 0 || goal === 'keep' ? undefined : (goal === 'lose') === v < 0 ? 'up' : 'down'
  const dir = (v: number | null) => (v === null || v === 0 ? undefined : v > 0 ? 'up' : 'down')
  const signed = (v: number | null, unit: string) =>
    v === null ? '—' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${nf.format(Math.abs(v))} ${unit}`

  return (
    <div className="space-y-10">
      <form
        className="card p-5"
        data-testid="weight-form"
        onSubmit={(e) => {
          e.preventDefault()
          const f = new FormData(e.currentTarget)
          const input = {
            date: String(f.get('date') || today),
            weight_kg: num(f.get('weight_kg')),
            waist_cm: num(f.get('waist_cm')),
            ...Object.fromEntries(EXTRA.map((k) => [k, num(f.get(k))])),
          } as MeasurementInput
          const form = e.currentTarget
          start(async () => {
            const r = await saveMeasurement(input)
            setMsg({ ok: r.ok, text: r.ok ? t('saved') : r.error === 'invalid' ? t('invalid') : t('error') })
            if (r.ok) {
              form.reset()
              router.refresh()
            }
          })
        }}
      >
        <h2 className="text-[17px] font-medium">{t('logTitle')}</h2>
        <p className="text-muted mt-1 text-[14px]">{t('logHint')}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <label className="text-[13.5px]">
            {t('weight')} <span className="text-subtle">(kg)</span>
            <input
              name="weight_kg"
              inputMode="decimal"
              placeholder={latestRow?.weight_kg ? nf.format(Number(latestRow.weight_kg)) : '75,0'}
              className="field mt-1 !py-1.5"
              data-testid="weight-input"
            />
          </label>
          <label className="text-[13.5px]">
            {t('waist_cm')} <span className="text-subtle">(cm)</span>
            <input name="waist_cm" inputMode="decimal" className="field mt-1 !py-1.5" />
          </label>
          <label className="col-span-2 text-[13.5px] sm:col-span-1">
            {t('date')}
            <input name="date" type="date" defaultValue={today} max={today} className="field mt-1 !py-1.5" />
          </label>
        </div>
        <button
          type="button"
          onClick={() => setMore((m) => !m)}
          aria-expanded={more}
          className="text-subtle hover:text-fg mt-3 inline-flex items-center gap-1 text-[13.5px]"
        >
          <ChevronDown size={15} className={cx('transition', more && 'rotate-180')} aria-hidden />
          {t('moreMeasures')}
        </button>
        {more && (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {EXTRA.map((k) => (
              <label key={k} className="text-[13.5px]">
                {t(k)} <span className="text-subtle">(cm)</span>
                <input name={k} inputMode="decimal" className="field mt-1 !py-1.5" />
              </label>
            ))}
          </div>
        )}
        <div className="mt-4 flex items-center gap-3">
          <button className="btn btn-primary !py-2" disabled={pending}>
            {t('save')}
          </button>
          {msg && (
            <span role="status" className={cx('text-[14px]', msg.ok ? 'text-bio' : 'text-[#ff9b9b]')}>
              {msg.text}
            </span>
          )}
        </div>
      </form>

      {all.length > 0 && (
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <Stat label={t('current')} value={`${nf.format(last.trend)} kg`} />
          <Stat label={t('change30')} value={signed(ch30, 'kg')} tone={tone(ch30)} dir={dir(ch30)} />
          <Stat label={t('perWeek')} value={signed(rate, 'kg')} tone={tone(rate)} dir={dir(rate)} />
          <Stat label={t('sinceStart')} value={signed(total, 'kg')} tone={tone(total)} dir={dir(total)} />
        </dl>
      )}

      <section aria-labelledby="w-chart">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="w-chart" className="text-[17px] font-medium">
              {t('chartTitle')}
            </h2>
            <p className="text-subtle mt-1 text-[13.5px]">{t('chartHint')}</p>
          </div>
          <div
            className="border-line flex rounded-full border p-0.5 text-[13px]"
            role="group"
            aria-label={t('range')}
          >
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={range === r}
                onClick={() => setRange(r)}
                className={cx('rounded-full px-3 py-1', range === r ? 'bg-cyan text-ink' : 'text-muted')}
              >
                {t(`range_${r}`)}
              </button>
            ))}
          </div>
        </div>

        {shown.length > 0 ? (
          <>
            <ul className="text-muted mt-3 flex gap-4 text-[12.5px]" aria-label={t('legend')}>
              <li className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-4 rounded" style={{ background: TREND }} aria-hidden />
                {t('trend')}
              </li>
              <li className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: DAILY }}
                  aria-hidden
                />
                {t('daily')}
              </li>
            </ul>
            <div className="mt-2 h-60 md:h-72" data-testid="weight-chart">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={shown} margin={{ left: -6, right: 10, top: 8 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) => df(d)}
                    stroke={AXIS}
                    fontSize={11.5}
                    tickLine={false}
                    interval="preserveStartEnd"
                    minTickGap={22}
                  />
                  <YAxis
                    stroke={AXIS}
                    fontSize={11.5}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                    domain={[yW.lo, yW.hi]}
                    ticks={yW.ticks}
                  />
                  <Tooltip
                    cursor={{ stroke: 'rgba(255,255,255,0.18)', strokeWidth: 1 }}
                    content={({ active, payload }) => {
                      const p = active && (payload?.[0]?.payload as TrendPoint | undefined)
                      if (!p) return null
                      return (
                        <div className="border-line-strong bg-ink-3 rounded-xl border px-3 py-2 text-[12.5px] shadow-lg">
                          <p className="text-subtle">{df(p.date, true)}</p>
                          <p className="mt-0.5 font-mono text-[14px]">
                            {t('trend')} {nf.format(p.trend)} kg
                          </p>
                          <p className="text-muted">
                            {t('daily')}: {nf.format(p.weightKg)} kg
                          </p>
                        </div>
                      )
                    }}
                  />
                  <Scatter dataKey="weightKg" fill={DAILY} shape={<Dot />} isAnimationActive={false} />
                  <Line
                    type="monotone"
                    dataKey="trend"
                    stroke={TREND}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, strokeWidth: 2, stroke: '#0b0f14', fill: TREND }}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <p className="text-muted border-line mt-4 rounded-2xl border border-dashed p-6 text-[14.5px]">
            {all.length ? t('emptyRange') : t('empty')}
          </p>
        )}
      </section>

      {waist.length > 1 && (
        <section aria-labelledby="waist-chart">
          <h2 id="waist-chart" className="text-[17px] font-medium">
            {t('waistTitle')}
          </h2>
          <p className="text-subtle mt-1 text-[13.5px]">{t('waistHint')}</p>
          <div className="mt-3 h-48 md:h-56" data-testid="waist-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={waist} margin={{ left: -6, right: 10, top: 8 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => df(d)}
                  stroke={AXIS}
                  fontSize={11.5}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={22}
                />
                <YAxis
                  stroke={AXIS}
                  fontSize={11.5}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  domain={[yWaist.lo, yWaist.hi]}
                  ticks={yWaist.ticks}
                />
                <Tooltip
                  cursor={{ stroke: 'rgba(255,255,255,0.18)', strokeWidth: 1 }}
                  content={({ active, payload }) => {
                    const p = active && (payload?.[0]?.payload as { date: string; waist: number } | undefined)
                    if (!p) return null
                    return (
                      <div className="border-line-strong bg-ink-3 rounded-xl border px-3 py-2 text-[12.5px] shadow-lg">
                        <p className="text-subtle">{df(p.date, true)}</p>
                        <p className="mt-0.5 font-mono text-[14px]">{nf.format(p.waist)} cm</p>
                      </div>
                    )
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="waist"
                  stroke={TREND}
                  strokeWidth={2}
                  dot={{ r: 4, strokeWidth: 2, stroke: '#0b0f14', fill: TREND }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {rows.length > 0 && (
        <section aria-labelledby="w-entries">
          <h2 id="w-entries" className="eyebrow mb-3">
            {t('entries')}
          </h2>
          <div className="border-line relative overflow-x-auto rounded-2xl border">
            <table className="w-full text-left text-[14px]">
              <thead className="text-subtle bg-white/[0.03] font-mono text-[12px]">
                <tr>
                  <th className="px-3 py-2.5 font-normal sm:px-4">{t('date')}</th>
                  <th className="px-4 py-2.5 font-normal">{t('weight')}</th>
                  <th className="px-4 py-2.5 font-normal">{t('waist_cm')}</th>
                  <th className="px-4 py-2.5 font-normal">
                    <span className="sr-only">{t('delete')}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-line divide-y font-mono">
                {[...rows]
                  .sort((a, b) => b.measured_at.localeCompare(a.measured_at))
                  .slice(0, 20)
                  .map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-2">{df(r.measured_at)}</td>
                      <td className="px-4 py-2">
                        {r.weight_kg !== null ? `${nf.format(Number(r.weight_kg))} kg` : '—'}
                      </td>
                      <td className="px-4 py-2">
                        {r.waist_cm !== null ? `${nf.format(Number(r.waist_cm))} cm` : '—'}
                      </td>
                      <td className="px-2 py-1 text-right">
                        <button
                          type="button"
                          aria-label={`${t('delete')} ${df(r.measured_at)}`}
                          className="text-subtle hover:text-fg rounded-lg p-2"
                          onClick={() =>
                            start(async () => {
                              await deleteMeasurement(r.id)
                              router.refresh()
                            })
                          }
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

/** Daily weigh-in marker: small, muted, with a surface ring so the trend line reads on top. */
function Dot(props: { cx?: number; cy?: number }) {
  if (props.cx === undefined || props.cy === undefined) return null
  return <circle cx={props.cx} cy={props.cy} r={3} fill={DAILY} stroke="#0b0f14" strokeWidth={1.5} />
}
