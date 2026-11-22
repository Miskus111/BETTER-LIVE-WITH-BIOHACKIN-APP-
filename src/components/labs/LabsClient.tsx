'use client'

import { useSafeTransition } from '@/lib/useSafeTransition'

import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { AlertTriangle, FileUp, ClipboardPaste, Scale, ShieldAlert, Trash2 } from 'lucide-react'
import {
  MARKERS,
  MARKER_BY_KEY,
  flagFor,
  type Flag,
  type LabCandidate,
  type MarkerCategory,
} from '@/lib/labs/markers'
import type { ExtractResponse } from '@/app/api/labs/extract/route'
import { parseLabText } from '@/lib/labs/parse-text'
import { deleteLabReport, saveLabReport } from '@/app/(app)/labs/actions'
import { cx } from '@/lib/format'
import { ProBadge } from '@/components/app/ProBadge'

export interface LabValue {
  marker: string
  value: number
  unit: string
  flag: Flag | null
  taken_on: string | null
  ref_low: number | null
  ref_high: number | null
}
export interface BodyComp {
  measured_on: string
  weight_kg: number | null
  skeletal_muscle_kg: number | null
  body_fat_pct: number | null
  visceral_fat_level: number | null
}
export interface LabReportRow {
  id: string
  kind: 'blood' | 'inbody'
  taken_on: string | null
  lab_name: string | null
}

const FLAG_STYLE: Record<Flag, string> = {
  normal: 'border-bio/40 text-bio',
  low: 'border-warn/50 text-warn',
  high: 'border-warn/50 text-warn',
  critical: 'border-[#ff6b6b]/60 bg-[#ff6b6b]/10 text-[#ff9b9b]',
}
const CATS: MarkerCategory[] = [
  'metabolic',
  'lipids',
  'liver',
  'kidney',
  'thyroid',
  'blood',
  'iron',
  'vitamins',
  'minerals',
  'inflammation',
  'hormones',
]
type Mode = 'upload' | 'paste' | 'inbody'
type Draft = {
  kind: 'blood' | 'inbody'
  taken_on: string
  lab_name: string
  storage_path: string | null
  rows: (LabCandidate & { include: boolean })[]
  inbody: ExtractResponse['inbody']
}

const today = () => new Date().toISOString().slice(0, 10)
const n = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')))

function Spark({ points }: { points: number[] }) {
  if (points.length < 2) return null
  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1
  const d = points
    .map((p, i) => `${(i / (points.length - 1)) * 60},${18 - ((p - min) / span) * 16}`)
    .join(' ')
  return (
    <svg width="60" height="20" viewBox="0 0 60 20" aria-hidden className="text-cyan">
      <polyline points={d} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export function LabsClient({
  values,
  comps,
  reports,
  aiEnabled,
}: {
  values: LabValue[]
  comps: BodyComp[]
  reports: LabReportRow[]
  aiEnabled: boolean
}) {
  const t = useTranslations('labs')
  const locale = useLocale() as 'cs' | 'en'
  const router = useRouter()
  const [mode, setMode] = useState<Mode>(aiEnabled ? 'upload' : 'paste')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useSafeTransition(() => setError(t('err_generic')))
  const [draft, setDraft] = useState<Draft | null>(null)
  const [text, setText] = useState('')
  const [saved, setSaved] = useState(false)

  const label = (key: string) => {
    const m = MARKER_BY_KEY[key]
    return m ? m[locale] : key
  }

  const extract = async (body: FormData) => {
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch('/api/labs/extract', { method: 'POST', body })
      const j = (await res.json()) as ExtractResponse & { error?: string }
      if (!res.ok) {
        setError(t(`err_${j.error ?? 'generic'}` as 'err_generic'))
        return
      }
      if (j.kind === 'other') {
        setError(t('err_not_lab'))
        return
      }
      setDraft({
        kind: j.kind,
        taken_on: j.taken_on ?? today(),
        lab_name: j.lab_name ?? '',
        storage_path: j.storage_path,
        rows: j.rows.map((r) => ({ ...r, include: !r.needsReview })),
        inbody: j.inbody,
      })
      if (!j.rows.length && !j.inbody) setError(t('err_nothing'))
    } catch {
      setError(t('err_generic'))
    } finally {
      setBusy(false)
    }
  }

  const updateRow = (i: number, patch: Partial<Draft['rows'][number]>) =>
    setDraft((d) => {
      if (!d) return d
      const rows = d.rows.slice()
      const r = { ...rows[i], ...patch }
      r.flag = r.marker ? flagFor(MARKER_BY_KEY[r.marker] ?? null, r.value, r.ref_low, r.ref_high) : null
      rows[i] = r
      return { ...d, rows }
    })

  const confirm = () =>
    start(async () => {
      if (!draft) return
      const rows = draft.rows.filter((r) => r.include && r.marker && Number.isFinite(r.value))
      const res = await saveLabReport({
        kind: draft.kind,
        taken_on: draft.taken_on,
        lab_name: draft.lab_name || null,
        storage_path: draft.storage_path,
        rows: rows.map((r) => ({
          marker: r.marker!,
          value: r.value,
          unit: r.unit,
          ref_low: r.ref_low,
          ref_high: r.ref_high,
          ref_text: r.ref_text,
        })),
        inbody: draft.inbody,
      })
      if (!res.ok) {
        console.error('[labs] save failed', res.error)
        setError(t('err_generic'))
      } else {
        setDraft(null)
        setText('')
        setSaved(true)
        router.refresh()
      }
    })

  // latest value + history per marker
  const byMarker = useMemo(() => {
    const map = new Map<string, LabValue[]>()
    for (const v of values) map.set(v.marker, [...(map.get(v.marker) ?? []), v])
    return map
  }, [values])
  const critical = values.filter((v) => v.flag === 'critical')

  return (
    <div className="space-y-8">
      <p className="text-muted max-w-2xl text-[15px]">{t('intro')}</p>

      {critical.length > 0 && (
        <div
          className="flex gap-3 rounded-xl border border-[#ff6b6b]/50 bg-[#ff6b6b]/10 p-4 text-[15px]"
          role="alert"
          data-testid="labs-critical"
        >
          <ShieldAlert className="mt-0.5 shrink-0 text-[#ff9b9b]" size={20} aria-hidden />
          <p>
            {t('criticalNote', { markers: [...new Set(critical.map((c) => label(c.marker)))].join(', ') })}
          </p>
        </div>
      )}

      {/* ── import ─────────────────────────────────────────────────── */}
      <section className="card p-5" aria-labelledby="labs-import">
        <h2 id="labs-import" className="text-[19px] font-medium">
          {t('import')}
        </h2>
        <div
          className="border-line mt-3 inline-flex flex-wrap rounded-full border p-0.5 text-[14px]"
          role="tablist"
        >
          {(
            [
              ['upload', FileUp],
              ['paste', ClipboardPaste],
              ['inbody', Scale],
            ] as const
          ).map(([m, Icon]) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={cx(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1',
                mode === m ? 'bg-cyan text-ink' : '',
              )}
            >
              <Icon size={14} aria-hidden /> {t(`mode_${m}`)}
              {m === 'upload' && <ProBadge className="ml-0.5" />}
            </button>
          ))}
        </div>

        {mode === 'upload' && (
          <div className="mt-4">
            {!aiEnabled && <p className="text-warn mb-3 text-[14px]">{t('aiOff')}</p>}
            <label className="border-line hover:border-cyan/60 block cursor-pointer rounded-xl border border-dashed p-6 text-center">
              <FileUp className="text-cyan mx-auto" size={24} aria-hidden />
              <span className="mt-2 block text-[15px]">{t('uploadCta')}</span>
              <span className="text-subtle mt-1 block text-[13px]">{t('uploadHint')}</span>
              <input
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/webp"
                className="sr-only"
                disabled={busy || !aiEnabled}
                data-testid="labs-file"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  const fd = new FormData()
                  fd.set('file', f)
                  void extract(fd)
                  e.target.value = ''
                }}
              />
            </label>
            <p className="text-subtle mt-2 text-[12.5px]">{t('aiPrivacy')}</p>
          </div>
        )}

        {mode === 'paste' && (
          <div className="mt-4">
            <textarea
              aria-label={t('pasteLabel')}
              placeholder={t('pastePlaceholder')}
              rows={7}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="field font-mono !text-[13.5px]"
              data-testid="labs-text"
            />
            <button
              type="button"
              className="btn btn-primary mt-3"
              disabled={busy || !text.trim()}
              onClick={() => {
                // pasted text is parsed on the device — nothing leaves the browser until you confirm
                const rows = parseLabText(text)
                setSaved(false)
                setError(rows.length ? null : t('err_nothing'))
                setDraft({
                  kind: 'blood',
                  taken_on: today(),
                  lab_name: '',
                  storage_path: null,
                  rows: rows.map((r) => ({ ...r, include: !r.needsReview })),
                  inbody: null,
                })
              }}
              data-testid="labs-parse"
            >
              {t('parse')}
            </button>
          </div>
        )}

        {mode === 'inbody' && (
          <form
            className="mt-4 grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault()
              const f = new FormData(e.currentTarget)
              setDraft({
                kind: 'inbody',
                taken_on: String(f.get('date') || today()),
                lab_name: 'InBody',
                storage_path: null,
                rows: [],
                inbody: {
                  weight_kg: n(String(f.get('weight'))),
                  skeletal_muscle_kg: n(String(f.get('smm'))),
                  body_fat_pct: n(String(f.get('pbf'))),
                  visceral_fat_level: n(String(f.get('vfl'))),
                },
              })
            }}
          >
            {(
              [
                ['weight', 'kg'],
                ['smm', 'kg'],
                ['pbf', '%'],
                ['vfl', ''],
              ] as const
            ).map(([k, u]) => (
              <label key={k} className="text-[14px]">
                {t(`ib_${k}`)} {u && <span className="text-subtle">({u})</span>}
                <input name={k} inputMode="decimal" className="field mt-1" />
              </label>
            ))}
            <label className="text-[14px]">
              {t('date')}
              <input name="date" type="date" defaultValue={today()} className="field mt-1" />
            </label>
            <div className="flex items-end">
              <button className="btn btn-primary">{t('review')}</button>
            </div>
          </form>
        )}

        {busy && (
          <p className="text-muted mt-4 text-[14px]" role="status">
            {t('reading')}
          </p>
        )}
        {error && (
          <p className="mt-4 flex gap-2 text-[14px] text-[#ff9b9b]" role="alert">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden /> {error}
          </p>
        )}
        {saved && (
          <p className="text-bio mt-4 text-[14px]" role="status">
            {t('saved')}
          </p>
        )}
      </section>

      {/* ── review & confirm ───────────────────────────────────────── */}
      {draft && (
        <section className="card border-cyan/40 p-5" aria-labelledby="labs-review" data-testid="labs-review">
          <h2 id="labs-review" className="text-[19px] font-medium">
            {t('reviewTitle')}
          </h2>
          <p className="text-muted mt-1 text-[14px]">{t('reviewHint')}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-[14px]">
              {t('date')}
              <input
                type="date"
                value={draft.taken_on}
                onChange={(e) => setDraft({ ...draft, taken_on: e.target.value })}
                className="field mt-1"
              />
            </label>
            <label className="text-[14px]">
              {t('labName')}
              <input
                value={draft.lab_name}
                onChange={(e) => setDraft({ ...draft, lab_name: e.target.value })}
                className="field mt-1"
              />
            </label>
          </div>

          {draft.rows.length > 0 && (
            <div className="mt-4 overflow-x-auto" tabIndex={0}>
              <table className="w-full min-w-[560px] text-[14px]">
                <thead className="text-subtle font-mono text-[11.5px] uppercase">
                  <tr>
                    <th className="w-8 py-1" />
                    <th className="py-1 text-left font-normal">{t('marker')}</th>
                    <th className="w-24 py-1 font-normal">{t('value')}</th>
                    <th className="w-28 py-1 text-left font-normal">{t('unit')}</th>
                    <th className="py-1 text-left font-normal">{t('ref')}</th>
                    <th className="w-24 py-1 font-normal" />
                  </tr>
                </thead>
                <tbody>
                  {draft.rows.map((r, i) => (
                    <tr key={i} className={cx('border-line border-t', !r.include && 'opacity-50')}>
                      <td className="py-1.5">
                        <input
                          type="checkbox"
                          aria-label={t('include')}
                          checked={r.include}
                          onChange={(e) => updateRow(i, { include: e.target.checked })}
                        />
                      </td>
                      <td className="py-1.5">
                        <select
                          aria-label={t('marker')}
                          value={r.marker ?? ''}
                          onChange={(e) =>
                            updateRow(i, {
                              marker: e.target.value || null,
                              unit: MARKER_BY_KEY[e.target.value]?.unit ?? r.unit,
                              include: !!e.target.value,
                            })
                          }
                          className="field !py-1"
                        >
                          <option value="">— {r.name} —</option>
                          {MARKERS.map((m) => (
                            <option key={m.key} value={m.key}>
                              {m[locale]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-1.5 pl-1">
                        <input
                          aria-label={t('value')}
                          inputMode="decimal"
                          defaultValue={String(r.value)}
                          onChange={(e) => updateRow(i, { value: Number(e.target.value.replace(',', '.')) })}
                          className="field !px-2 !py-1 text-center"
                        />
                      </td>
                      <td className="text-muted py-1.5 pl-2 font-mono text-[13px]">{r.unit}</td>
                      <td className="text-muted py-1.5 font-mono text-[13px]">
                        {r.ref_low ?? ''}
                        {r.ref_low !== null || r.ref_high !== null ? ' – ' : ''}
                        {r.ref_high ?? ''}
                      </td>
                      <td className="py-1.5 text-right">
                        {r.needsReview ? (
                          <span className="text-warn text-[12.5px]">{t('check')}</span>
                        ) : (
                          r.flag && (
                            <span
                              className={cx(
                                'rounded-full border px-2 py-0.5 text-[12px]',
                                FLAG_STYLE[r.flag],
                              )}
                            >
                              {t(`flag_${r.flag}`)}
                            </span>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {draft.inbody && (
            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                [
                  ['weight', 'weight_kg', 'kg'],
                  ['smm', 'skeletal_muscle_kg', 'kg'],
                  ['pbf', 'body_fat_pct', '%'],
                  ['vfl', 'visceral_fat_level', ''],
                ] as const
              ).map(([k, f, u]) => (
                <div key={k} className="border-line rounded-xl border p-3">
                  <dt className="text-subtle text-[12.5px]">{t(`ib_${k}`)}</dt>
                  <dd className="mt-1 font-mono text-[17px]">
                    {draft.inbody?.[f] ?? '—'} {u}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary"
              onClick={confirm}
              disabled={pending}
              data-testid="labs-confirm"
            >
              {t('confirm')}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setDraft(null)}>
              {t('cancel')}
            </button>
          </div>
        </section>
      )}

      {/* ── results ────────────────────────────────────────────────── */}
      <section aria-labelledby="labs-results">
        <h2 id="labs-results" className="text-[19px] font-medium">
          {t('results')}
        </h2>
        {byMarker.size === 0 ? (
          <p className="text-muted mt-2 text-[15px]">{t('empty')}</p>
        ) : (
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            {CATS.map((cat) => {
              const keys = [...byMarker.keys()].filter(
                (k) => (MARKER_BY_KEY[k]?.category ?? 'metabolic') === cat,
              )
              if (!keys.length) return null
              return (
                <div key={cat} className="card p-4">
                  <h3 className="text-cyan font-mono text-[12px] tracking-[0.12em] uppercase">
                    {t(`cat_${cat}`)}
                  </h3>
                  <ul className="mt-2 divide-y divide-white/5">
                    {keys.map((k) => {
                      const hist = byMarker.get(k)!
                      const last = hist[hist.length - 1]
                      return (
                        <li
                          key={k}
                          className="flex items-center gap-3 py-2 text-[14.5px]"
                          data-testid={`lab-${k}`}
                        >
                          <span className="min-w-0 flex-1">{label(k)}</span>
                          <Spark points={hist.map((h) => h.value)} />
                          <span className="font-mono">
                            {Number(last.value).toLocaleString(locale === 'en' ? 'en' : 'cs-CZ')}{' '}
                            <span className="text-subtle text-[12px]">{last.unit}</span>
                          </span>
                          {last.flag && (
                            <span
                              className={cx(
                                'rounded-full border px-2 py-0.5 text-[12px]',
                                FLAG_STYLE[last.flag],
                              )}
                            >
                              {t(`flag_${last.flag}`)}
                            </span>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {comps.length > 0 && (
        <section aria-labelledby="labs-inbody" className="card p-4">
          <h2 id="labs-inbody" className="text-[17px] font-medium">
            {t('bodyComp')}
          </h2>
          <div className="mt-2 overflow-x-auto" tabIndex={0}>
            <table className="w-full min-w-[420px] text-[14px]">
              <thead className="text-subtle font-mono text-[11.5px] uppercase">
                <tr>
                  <th className="py-1 text-left font-normal">{t('date')}</th>
                  <th className="py-1 font-normal">{t('ib_weight')}</th>
                  <th className="py-1 font-normal">{t('ib_smm')}</th>
                  <th className="py-1 font-normal">{t('ib_pbf')}</th>
                  <th className="py-1 font-normal">{t('ib_vfl')}</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {comps.map((c) => (
                  <tr key={c.measured_on} className="border-line border-t text-center">
                    <td className="py-1.5 text-left">{c.measured_on}</td>
                    <td>{c.weight_kg ?? '—'}</td>
                    <td>{c.skeletal_muscle_kg ?? '—'}</td>
                    <td>{c.body_fat_pct ?? '—'}</td>
                    <td>{c.visceral_fat_level ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {reports.length > 0 && (
        <section aria-labelledby="labs-reports">
          <h2 id="labs-reports" className="text-[17px] font-medium">
            {t('reports')}
          </h2>
          <ul className="mt-2 space-y-1.5">
            {reports.map((r) => (
              <li
                key={r.id}
                className="border-line flex items-center gap-3 rounded-xl border px-3 py-2 text-[14px]"
              >
                <span className="font-mono">{r.taken_on ?? '—'}</span>
                <span className="text-muted flex-1">
                  {r.lab_name ?? (r.kind === 'inbody' ? 'InBody' : t('blood'))}
                </span>
                <button
                  type="button"
                  aria-label={t('deleteReport')}
                  className="text-subtle p-1 hover:text-[#ff9b9b]"
                  onClick={() => {
                    if (window.confirm(t('deleteConfirm')))
                      start(async () => {
                        await deleteLabReport(r.id)
                        router.refresh()
                      })
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-subtle max-w-2xl text-[13px]">{t('disclaimer')}</p>
    </div>
  )
}
