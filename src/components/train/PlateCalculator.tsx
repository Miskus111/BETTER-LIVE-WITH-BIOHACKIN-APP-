'use client'

import { useTranslations } from 'next-intl'
import { useEscape, useRestoreFocus, useFocusTrap } from '@/lib/dialog'
import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { platesPerSide } from '@/lib/train/strength'

export function PlateCalculator({ initial, onClose }: { initial: number; onClose: () => void }) {
  const t = useTranslations('train')
  const common = useTranslations('common')
  useEscape(onClose)
  useRestoreFocus()
  const box = useRef<HTMLDivElement>(null)
  useFocusTrap(box)
  const close = useRef<HTMLButtonElement>(null)
  // after useRestoreFocus has noted the opener (autoFocus would move focus before that)
  useEffect(() => close.current?.focus(), [])
  const [target, setTarget] = useState(String(initial || 60))
  const [bar, setBar] = useState(20)
  const r = platesPerSide(Number(target) || 0, bar)
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
      onClick={onClose}
    >
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-label={t('plates')}
        className="bg-ink-3 border-line w-full max-w-sm rounded-t-3xl border p-5 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-medium">{t('plates')}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={common('close')}
            ref={close}
            className="text-subtle"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-muted grid gap-1 text-[13px]">
            kg
            <input
              inputMode="decimal"
              className="field"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </label>
          <label className="text-muted grid gap-1 text-[13px]">
            {t('bar')}
            <select className="field" value={bar} onChange={(e) => setBar(Number(e.target.value))}>
              {[20, 15, 10].map((b) => (
                <option key={b} value={b}>
                  {b} kg
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="text-subtle mt-4 font-mono text-[12px] uppercase">{t('platesPerSide')}</p>
        <div className="mt-2 flex min-h-12 flex-wrap items-center gap-1.5">
          {r.plates.length === 0 && <span className="text-muted">—</span>}
          {r.plates.map((p, i) => (
            <span
              key={i}
              className="bg-cyan/15 text-cyan grid h-11 min-w-11 place-items-center rounded-lg px-2 font-mono text-[14px]"
            >
              {p}
            </span>
          ))}
        </div>
        {r.remainder !== 0 && (
          <p className="text-warn mt-2 text-[13px]">
            {t('remainder')} {r.remainder} kg ({r.achieved} kg)
          </p>
        )}
      </div>
    </div>
  )
}
