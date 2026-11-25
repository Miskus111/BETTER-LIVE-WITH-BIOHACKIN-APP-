'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { Camera, Columns2, Lock, SplitSquareHorizontal, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { photoPath, preparePhoto } from '@/lib/body/photo'
import { deletePhoto, savePhoto } from '@/app/(app)/body/photos/actions'
import { cx } from '@/lib/format'
import { scrollBehavior } from '@/lib/motion'
import { useEscape } from '@/lib/useEscape'

export type Pose = 'front' | 'side' | 'back' | 'other'
export interface PhotoItem {
  id: string
  taken_at: string
  pose: Pose | null
  notes: string | null
  url: string | null // signed URL (short-lived)
  weightKg: number | null // weigh-in closest to the photo date, if any
}

const POSES: Pose[] = ['front', 'side', 'back', 'other']

export function PhotoJournal({
  photos,
  userId,
  today,
}: {
  photos: PhotoItem[]
  userId: string
  today: string
}) {
  const t = useTranslations('photos')
  const locale = useLocale()
  const router = useRouter()
  const [pending, start] = useTransition()
  const [file, setFile] = useState<File | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [filter, setFilter] = useState<Pose | 'all'>('all')
  const [picking, setPicking] = useState(false)
  const [picked, setPicked] = useState<string[]>([])
  const [open, setOpen] = useState<PhotoItem | null>(null)
  useEscape(() => setOpen(null), open !== null)
  // closing the viewer gives keyboard focus back to the thumbnail that opened it
  const opener = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (open === null && opener.current?.isConnected) {
      opener.current.focus()
      opener.current = null
    }
  }, [open])
  const inputRef = useRef<HTMLInputElement>(null)

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => (preview ? URL.revokeObjectURL(preview) : undefined), [preview])

  const df = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString(locale === 'en' ? 'en-GB' : 'cs-CZ', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  const nf = new Intl.NumberFormat(locale === 'en' ? 'en' : 'cs-CZ', { maximumFractionDigits: 1 })

  const shown = photos.filter((p) => filter === 'all' || p.pose === filter)
  const pair = useMemo(() => {
    if (picked.length !== 2) return null
    const [a, b] = picked
      .map((id) => photos.find((p) => p.id === id)!)
      .sort((x, y) => x.taken_at.localeCompare(y.taken_at))
    return { before: a, after: b }
  }, [picked, photos])

  // bring the comparison into view as soon as the second photo is picked
  useEffect(() => {
    if (pair)
      document.getElementById('compare-title')?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' })
  }, [pair])

  const togglePick = (id: string) =>
    setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur.slice(-1), id]))

  return (
    <div className="space-y-10">
      <form
        className="card p-5"
        data-testid="photo-form"
        onSubmit={(e) => {
          e.preventDefault()
          if (!file) return setMsg({ ok: false, text: t('pickFirst') })
          const f = new FormData(e.currentTarget)
          const form = e.currentTarget
          start(async () => {
            try {
              const blob = await preparePhoto(file)
              const path = photoPath(userId, crypto.randomUUID())
              const supabase = createClient()
              const up = await supabase.storage
                .from('progress-photos')
                .upload(path, blob, { contentType: 'image/jpeg', upsert: false })
              if (up.error) throw up.error
              const r = await savePhoto({
                path,
                taken_at: String(f.get('taken_at') || today),
                pose: (f.get('pose') as Pose) || 'front',
                notes: String(f.get('notes') ?? '') || null,
              })
              if (!r.ok) throw new Error(r.error)
              setMsg({ ok: true, text: t('saved') })
              setFile(null)
              form.reset()
              router.refresh()
            } catch (err) {
              const m = err instanceof Error ? err.message : ''
              setMsg({ ok: false, text: m === 'encode' || m === 'canvas' ? t('formatError') : t('error') })
            }
          })
        }}
      >
        <h2 className="text-[17px] font-medium">{t('addTitle')}</h2>
        <p className="text-muted mt-1 text-[14px]">{t('addHint')}</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-[180px_1fr]">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="border-line hover:border-cyan/40 grid aspect-[3/4] w-full place-items-center overflow-hidden rounded-2xl border border-dashed transition sm:w-[180px]"
            aria-label={t('pick')}
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-subtle flex flex-col items-center gap-2 text-[13.5px]">
                <Camera size={26} className="text-cyan" aria-hidden />
                {t('pick')}
              </span>
            )}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label={t('pick')}
            tabIndex={-1}
            data-testid="photo-input"
            onChange={(e) => {
              setMsg(null)
              const f = e.target.files?.[0] ?? null
              if (f && f.size > 25 * 1024 * 1024) {
                setMsg({ ok: false, text: t('tooBig') })
                return
              }
              setFile(f)
            }}
          />
          <div className="grid content-start gap-3">
            <fieldset>
              <legend className="text-[13.5px]">{t('pose')}</legend>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {POSES.map((p, i) => (
                  <label key={p} className="cursor-pointer">
                    <input
                      type="radio"
                      name="pose"
                      value={p}
                      defaultChecked={i === 0}
                      className="peer sr-only"
                    />
                    <span className="border-line peer-checked:border-cyan peer-checked:bg-cyan/10 peer-focus-visible:ring-cyan/60 block rounded-full border px-3 py-1.5 text-[13.5px] peer-focus-visible:ring-2">
                      {t(`pose_${p}`)}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="text-[13.5px]">
              {t('date')}
              <input
                name="taken_at"
                type="date"
                defaultValue={today}
                max={today}
                className="field mt-1 !py-1.5"
              />
            </label>
            <label className="text-[13.5px]">
              {t('note')} <span className="text-subtle">({t('optional')})</span>
              <input
                name="notes"
                maxLength={300}
                className="field mt-1 !py-1.5"
                placeholder={t('notePlaceholder')}
              />
            </label>
            <div className="flex items-center gap-3">
              <button className="btn btn-primary !py-2" disabled={pending || !file}>
                {pending ? t('uploading') : t('save')}
              </button>
              {msg && (
                <span role="status" className={cx('text-[14px]', msg.ok ? 'text-bio' : 'text-[#ff9b9b]')}>
                  {msg.text}
                </span>
              )}
            </div>
          </div>
        </div>
        <p className="text-subtle mt-4 flex items-start gap-2 text-[12.5px]">
          <Lock size={14} className="mt-0.5 shrink-0" aria-hidden /> {t('privacy')}
        </p>
      </form>

      <section aria-labelledby="gallery-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="gallery-title" className="text-[17px] font-medium">
            {t('gallery')} <span className="text-subtle font-mono text-[13px]">({photos.length})</span>
          </h2>
          {photos.length > 1 && (
            <button
              type="button"
              onClick={() => {
                setPicking((v) => !v)
                setPicked([])
              }}
              aria-pressed={picking}
              className={cx('btn !py-1.5 text-[14px]', picking ? 'btn-primary' : 'btn-ghost')}
              data-testid="compare-toggle"
            >
              <Columns2 size={16} aria-hidden /> {picking ? t('cancelCompare') : t('compare')}
            </button>
          )}
        </div>
        {photos.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={t('pose')}>
            {(['all', ...POSES] as const).map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={filter === p}
                onClick={() => setFilter(p)}
                className={cx(
                  'rounded-full border px-3 py-1 text-[13px]',
                  filter === p ? 'border-cyan bg-cyan/10 text-fg' : 'border-line text-muted',
                )}
              >
                {p === 'all' ? t('all') : t(`pose_${p}`)}
              </button>
            ))}
          </div>
        )}
        {picking && <p className="text-cyan mt-3 text-[14px]">{t('pickTwo', { n: picked.length })}</p>}

        {shown.length === 0 ? (
          <p className="text-muted border-line mt-4 rounded-2xl border border-dashed p-6 text-[14.5px]">
            {photos.length ? t('emptyFilter') : t('empty')}
          </p>
        ) : (
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" data-testid="gallery">
            {shown.map((p) => {
              const sel = picked.includes(p.id)
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={(e) => {
                      if (picking) return togglePick(p.id)
                      opener.current = e.currentTarget
                      setOpen(p)
                    }}
                    aria-pressed={picking ? sel : undefined}
                    className={cx(
                      'group border-line relative block w-full overflow-hidden rounded-2xl border text-left transition',
                      sel && 'ring-cyan ring-2',
                    )}
                  >
                    <div className="bg-ink-3 aspect-[3/4]">
                      {p.url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.url}
                          alt={`${t(`pose_${p.pose ?? 'other'}`)} · ${df(p.taken_at)}`}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <span className="block p-2.5">
                      <span className="block text-[13.5px]">{df(p.taken_at)}</span>
                      <span className="text-subtle block font-mono text-[12px]">
                        {t(`pose_${p.pose ?? 'other'}`)}
                        {p.weightKg !== null && ` · ${nf.format(p.weightKg)} kg`}
                      </span>
                    </span>
                    {sel && (
                      <span className="bg-cyan text-ink absolute top-2 left-2 grid h-7 w-7 place-items-center rounded-full font-mono text-[13px]">
                        {picked.indexOf(p.id) + 1}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {pair && (
        <Compare before={pair.before} after={pair.after} df={df} nf={nf} onClose={() => setPicked([])} />
      )}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={df(open.taken_at)}
          className="bg-ink/95 fixed inset-0 z-50 flex flex-col p-4 backdrop-blur-md"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[15px]">{df(open.taken_at)}</p>
              <p className="text-subtle text-[13px]">
                {t(`pose_${open.pose ?? 'other'}`)}
                {open.weightKg !== null && ` · ${nf.format(open.weightKg)} kg`}
                {open.notes && ` · ${open.notes}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn btn-ghost !py-1.5 text-[14px]"
                onClick={() => {
                  if (!confirm(t('confirmDelete'))) return
                  const id = open.id
                  start(async () => {
                    await deletePhoto(id)
                    setOpen(null)
                    router.refresh()
                  })
                }}
              >
                <Trash2 size={15} aria-hidden /> {t('delete')}
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => setOpen(null)}
                className="border-line grid h-10 w-10 place-items-center rounded-full border"
                aria-label={t('close')}
              >
                <X size={18} />
              </button>
            </div>
          </div>
          <div className="mt-4 min-h-0 flex-1">
            {open.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={open.url}
                alt=""
                className="mx-auto h-full max-h-full w-auto rounded-2xl object-contain"
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/** Before/after: side by side, or one over the other with a drag handle. */
function Compare({
  before,
  after,
  df,
  nf,
  onClose,
}: {
  before: PhotoItem
  after: PhotoItem
  df: (iso: string) => string
  nf: Intl.NumberFormat
  onClose: () => void
}) {
  const t = useTranslations('photos')
  const [mode, setMode] = useState<'side' | 'slider'>('side')
  const [pos, setPos] = useState(50)
  const days = Math.round((Date.parse(after.taken_at) - Date.parse(before.taken_at)) / 864e5)
  const dw = before.weightKg !== null && after.weightKg !== null ? after.weightKg - before.weightKg : null

  return (
    <section aria-labelledby="compare-title" className="card p-4 sm:p-5" data-testid="compare">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="compare-title" className="text-[17px] font-medium">
            {t('compareTitle')}
          </h2>
          <p className="text-subtle text-[13.5px]">
            {t('daysApart', { n: days })}
            {dw !== null && ` · ${dw > 0 ? '+' : dw < 0 ? '−' : ''}${nf.format(Math.abs(dw))} kg`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="border-line flex rounded-full border p-0.5 text-[13px]"
            role="group"
            aria-label={t('compareMode')}
          >
            <button
              type="button"
              aria-pressed={mode === 'side'}
              onClick={() => setMode('side')}
              className={cx(
                'flex items-center gap-1 rounded-full px-3 py-1',
                mode === 'side' ? 'bg-cyan text-ink' : 'text-muted',
              )}
            >
              <Columns2 size={14} aria-hidden /> {t('modeSide')}
            </button>
            <button
              type="button"
              aria-pressed={mode === 'slider'}
              onClick={() => setMode('slider')}
              className={cx(
                'flex items-center gap-1 rounded-full px-3 py-1',
                mode === 'slider' ? 'bg-cyan text-ink' : 'text-muted',
              )}
            >
              <SplitSquareHorizontal size={14} aria-hidden /> {t('modeSlider')}
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-subtle hover:text-fg p-2"
            aria-label={t('close')}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {mode === 'side' ? (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3">
          {[before, after].map((p, i) => (
            <figure key={p.id}>
              <div className="bg-ink-3 aspect-[3/4] overflow-hidden rounded-xl">
                {p.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.url} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <figcaption className="mt-1.5 text-[13px]">
                <span className="text-subtle font-mono text-[11.5px] uppercase">
                  {i === 0 ? t('before') : t('after')}
                </span>
                <br />
                {df(p.taken_at)}
                {p.weightKg !== null && <span className="text-subtle"> · {nf.format(p.weightKg)} kg</span>}
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <div className="mt-4">
          <div className="bg-ink-3 relative mx-auto aspect-[3/4] max-w-md overflow-hidden rounded-xl select-none">
            {after.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={after.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
            )}
            {before.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={before.url}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
              />
            )}
            <div className="bg-cyan absolute inset-y-0 w-0.5" style={{ left: `${pos}%` }} aria-hidden />
            <span className="bg-ink/80 absolute top-2 left-2 rounded-full px-2 py-0.5 font-mono text-[11px]">
              {t('before')}
            </span>
            <span className="bg-ink/80 absolute top-2 right-2 rounded-full px-2 py-0.5 font-mono text-[11px]">
              {t('after')}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={pos}
            onChange={(e) => setPos(Number(e.target.value))}
            aria-label={t('sliderLabel')}
            className="accent-cyan mx-auto mt-3 block w-full max-w-md"
          />
        </div>
      )}
    </section>
  )
}
