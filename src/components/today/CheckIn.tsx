'use client'

import { useSafeTransition } from '@/lib/useSafeTransition'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { saveCheckIn, type CheckInInput } from '@/app/(app)/today/actions'

const n = (v: FormDataEntryValue | null) => {
  const s = String(v ?? '')
    .trim()
    .replace(',', '.')
  return s === '' ? null : Number(s)
}

export function CheckIn({ date, initial }: { date: string; initial: Partial<CheckInInput> }) {
  const t = useTranslations('today')
  const router = useRouter()
  const [msg, setMsg] = useState<string | null>(null)
  const [pending, start] = useSafeTransition(() => setMsg(t('checkinError')))
  const fields = [
    ['sleep_hours', 'h', 'decimal'],
    ['sleep_quality', '1–5', 'numeric'],
    ['steps', '', 'numeric'],
    ['water_ml', 'ml', 'numeric'],
    ['hrv_ms', 'ms', 'numeric'],
    ['resting_hr', 'bpm', 'numeric'],
    ['stress', '1–5', 'numeric'],
  ] as const
  return (
    <form
      className="card p-5"
      aria-labelledby="checkin"
      data-testid="checkin"
      onSubmit={(e) => {
        e.preventDefault()
        const f = new FormData(e.currentTarget)
        const input = { date, ...Object.fromEntries(fields.map(([k]) => [k, n(f.get(k))])) } as CheckInInput
        start(async () => {
          const r = await saveCheckIn(input)
          setMsg(r.ok ? t('checkinSaved') : t('checkinError'))
          if (r.ok) router.refresh()
        })
      }}
    >
      <h2 id="checkin" className="text-[17px] font-medium">
        {t('checkin')}
      </h2>
      <p className="text-muted mt-1 text-[14px]">{t('checkinHint')}</p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {fields.map(([k, unit, mode]) => (
          <label key={k} className="text-[13.5px]">
            {t(`f_${k}`)} {unit && <span className="text-subtle">({unit})</span>}
            <input name={k} inputMode={mode} defaultValue={initial[k] ?? ''} className="field mt-1 !py-1.5" />
          </label>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button className="btn btn-primary !py-2" disabled={pending}>
          {t('checkinSave')}
        </button>
        {msg && (
          <span className="text-muted text-[14px]" role="status">
            {msg}
          </span>
        )}
      </div>
    </form>
  )
}
