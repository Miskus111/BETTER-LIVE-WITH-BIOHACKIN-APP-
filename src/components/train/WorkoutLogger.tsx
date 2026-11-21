'use client'

import Link from '@/components/ui/Link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'
import { Calculator, Check, CloudOff, Link2, Plus, Trash2, WifiOff } from 'lucide-react'
import { useSession, type SessionExercise, type SessionSet } from '@/lib/train/session-store'
import { estimate1RM, toKg, toLb, volume, type SetType } from '@/lib/train/strength'
import { syncQueue } from '@/lib/train/sync'
import { useHydrated } from '@/lib/useHydrated'
import { cx } from '@/lib/format'
import { ExercisePicker } from './ExercisePicker'
import { PlateCalculator } from './PlateCalculator'
import { RestTimer } from './RestTimer'
import { useExerciseName } from './useExerciseName'

const TYPES: SetType[] = ['normal', 'warmup', 'drop', 'failure']
const TYPE_MARK: Record<SetType, string> = { normal: '', warmup: 'W', drop: 'D', failure: 'F' }

function useElapsed(since: string | undefined) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  if (!since) return '0:00'
  const s = Math.max(0, Math.floor((now - new Date(since).getTime()) / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h
    ? `${h}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
    : `${m}:${String(s % 60).padStart(2, '0')}`
}

export function WorkoutLogger({ home = '/train' }: { home?: string }) {
  const t = useTranslations('train')
  const hydrated = useHydrated()
  const router = useRouter()
  const s = useSession()
  const name = useExerciseName()
  const [picker, setPicker] = useState(false)
  const [plates, setPlates] = useState<number | null>(null)
  const [savedOffline, setSavedOffline] = useState(false)
  const elapsed = useElapsed(s.active?.startedAt)
  const online = typeof navigator === 'undefined' ? true : navigator.onLine

  const stats = useMemo(() => {
    const all = (s.active?.exercises ?? []).flatMap((e) =>
      e.sets.map((x) => ({
        exercise: e.slug,
        weightKg: x.weightKg ?? 0,
        reps: x.reps ?? 0,
        type: x.type,
        completed: x.done,
      })),
    )
    return { volume: volume(all), done: all.filter((x) => x.completed).length }
  }, [s.active])

  useEffect(() => {
    if (hydrated && !s.active && !savedOffline) router.replace(home)
  }, [hydrated, s.active, router, home, savedOffline])

  if (savedOffline) {
    const pending = s.queue.filter((w) => !w.synced).length
    return (
      <div className="card mx-auto mt-10 max-w-md p-6 text-center" role="status" data-testid="saved-offline">
        <CloudOff size={28} className="text-warn mx-auto" aria-hidden />
        <p className="mt-3 text-[16px]">{t('savedOffline')}</p>
        <p className="text-muted mt-1 font-mono text-[13px]">
          {t('pending')}: {pending}
        </p>
        <Link href={home} className="btn btn-ghost mt-5">
          {t('backToTrain')}
        </Link>
      </div>
    )
  }

  if (!hydrated || !s.active) return <div className="h-64" aria-busy="true" />
  const a = s.active
  const lb = s.units === 'lb'
  const show = (kg: number | null) => (kg === null ? '' : String(lb ? toLb(kg) : kg))
  const parseW = (v: string) =>
    v === '' ? null : lb ? toKg(Number(v.replace(',', '.'))) : Number(v.replace(',', '.'))

  const complete = (e: SessionExercise, x: SessionSet) => {
    const done = !x.done
    s.updateSet(e.id, x.id, { done })
    if (done) {
      // ask once for notification permission so the rest timer can alert in the background
      if ('Notification' in window && Notification.permission === 'default')
        void Notification.requestPermission()
      s.startRest()
    }
  }

  const finish = async () => {
    const q = s.finish()
    if (!q) return
    if (!navigator.onLine) {
      // a route change needs the server; stay here until the connection is back
      setSavedOffline(true)
      return
    }
    await syncQueue()
    router.replace(`${home}?finished=1`)
  }

  return (
    <div className="pb-24">
      <div className="flex flex-wrap items-center gap-3">
        <input
          aria-label={t('workoutName')}
          value={a.name}
          placeholder={t('defaultName')}
          onChange={(e) => s.rename(e.target.value)}
          className="display min-w-0 flex-1 bg-transparent text-[34px] outline-none placeholder:text-white/40"
        />
        <button type="button" onClick={finish} className="btn btn-primary" data-testid="finish-workout">
          <Check size={16} aria-hidden /> {t('finish')}
        </button>
      </div>
      <div className="text-muted mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[13px]">
        <span>
          {t('elapsed')} {elapsed}
        </span>
        <span>
          {t('volume')} {lb ? toLb(stats.volume) : stats.volume} {s.units}
        </span>
        <span>
          {t('setsDone')} {stats.done}
        </span>
        <div className="border-line ml-auto inline-flex rounded-full border p-0.5">
          {(['kg', 'lb'] as const).map((u) => (
            <button
              key={u}
              type="button"
              aria-pressed={s.units === u}
              onClick={() => s.setUnits(u)}
              className={cx('rounded-full px-2.5 py-0.5', s.units === u ? 'bg-cyan text-ink' : '')}
            >
              {u}
            </button>
          ))}
        </div>
      </div>
      {!online && (
        <p className="border-warn/30 bg-warn/[0.06] mt-4 flex gap-2 rounded-xl border p-3 text-[14px]">
          <WifiOff size={16} className="text-warn mt-0.5 shrink-0" aria-hidden /> {t('offline')}
        </p>
      )}

      <ol className="mt-6 space-y-4">
        {a.exercises.map((e, ei) => {
          const prev = s.previous[e.slug] ?? []
          const linked = e.superset !== null && ei > 0 && a.exercises[ei - 1].superset === e.superset
          return (
            <li
              key={e.id}
              className={cx('card p-4', linked && 'border-l-cyan/60 border-l-4')}
              data-testid={`exercise-${e.slug}`}
            >
              <div className="flex items-start justify-between gap-2">
                <Link href={`/train/exercises/${e.slug}`} className="hover:text-cyan text-[17px] font-medium">
                  {name(e.slug)}
                </Link>
                <div className="flex items-center gap-1">
                  {ei > 0 && (
                    <button
                      type="button"
                      title={t('superset')}
                      aria-label={t('superset')}
                      aria-pressed={linked}
                      onClick={() => s.toggleSuperset(e.id)}
                      className={cx('rounded-lg p-2', linked ? 'text-cyan' : 'text-subtle')}
                    >
                      <Link2 size={16} />
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label={t('plates')}
                    onClick={() => setPlates(e.sets.at(-1)?.weightKg ?? 60)}
                    className="text-subtle rounded-lg p-2"
                  >
                    <Calculator size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label={t('remove')}
                    onClick={() => s.removeExercise(e.id)}
                    className="text-subtle rounded-lg p-2 hover:text-[#ff9b9b]"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <table className="mt-3 w-full text-[14.5px]">
                <thead className="text-subtle font-mono text-[11.5px] uppercase">
                  <tr>
                    <th className="w-12 py-1 text-left font-normal">{t('set')}</th>
                    <th className="py-1 pl-1 text-left font-normal">{t('previous')}</th>
                    <th className="w-20 py-1 font-normal">{s.units}</th>
                    <th className="w-16 py-1 font-normal">{t('reps')}</th>
                    <th className="w-14 py-1 font-normal">{t('rpe')}</th>
                    <th className="w-10 py-1 font-normal">
                      <span className="sr-only">{t('done')}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {e.sets.map((x, i) => {
                    const p = prev[i]
                    const working = e.sets.slice(0, i + 1).filter((y) => y.type !== 'warmup').length
                    return (
                      <tr key={x.id} className={cx(x.done && 'bg-bio/[0.06]')}>
                        <td className="py-1">
                          {/* the closed select shows only the set mark (1, W, D, F); the full name is in the list */}
                          <span className="relative grid h-9 w-10 place-items-center rounded-lg font-mono text-[14px] hover:bg-white/[0.04]">
                            <span aria-hidden className={cx(x.type !== 'normal' && 'text-warn')}>
                              {TYPE_MARK[x.type] || working}
                            </span>
                            <select
                              aria-label={`${t('set')} ${working}: ${t(`type_${x.type}`)}`}
                              value={x.type}
                              onChange={(ev) => s.updateSet(e.id, x.id, { type: ev.target.value as SetType })}
                              className="absolute inset-0 cursor-pointer appearance-none opacity-0"
                            >
                              {TYPES.map((ty) => (
                                <option key={ty} value={ty}>
                                  {TYPE_MARK[ty] || '•'} {t(`type_${ty}`)}
                                </option>
                              ))}
                            </select>
                          </span>
                        </td>
                        <td className="text-subtle py-1 pl-1 font-mono text-[12.5px] whitespace-nowrap">
                          {p ? `${show(p.weightKg)} × ${p.reps}` : '—'}
                        </td>
                        <td className="py-1">
                          <input
                            aria-label={s.units}
                            inputMode="decimal"
                            className="field !px-2 !py-1.5 text-center"
                            value={show(x.weightKg)}
                            onChange={(ev) => s.updateSet(e.id, x.id, { weightKg: parseW(ev.target.value) })}
                          />
                        </td>
                        <td className="py-1 pl-1">
                          <input
                            aria-label={t('reps')}
                            inputMode="numeric"
                            className="field !px-2 !py-1.5 text-center"
                            value={x.reps ?? ''}
                            onChange={(ev) =>
                              s.updateSet(e.id, x.id, {
                                reps: ev.target.value === '' ? null : Number(ev.target.value),
                              })
                            }
                          />
                        </td>
                        <td className="py-1 pl-1">
                          <input
                            aria-label={t('rpe')}
                            inputMode="decimal"
                            className="field !px-1 !py-1.5 text-center"
                            value={x.rpe ?? ''}
                            onChange={(ev) =>
                              s.updateSet(e.id, x.id, {
                                rpe: ev.target.value === '' ? null : Math.min(10, Number(ev.target.value)),
                              })
                            }
                          />
                        </td>
                        <td className="py-1 pl-1">
                          <button
                            type="button"
                            aria-label={t('done')}
                            aria-pressed={x.done}
                            onClick={() => complete(e, x)}
                            className={cx(
                              'grid h-9 w-9 place-items-center rounded-lg border',
                              x.done ? 'border-bio bg-bio text-ink' : 'border-line text-subtle',
                            )}
                            data-testid="set-done"
                          >
                            <Check size={16} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {(() => {
                const best = e.sets
                  .filter((x) => x.done && x.weightKg && x.reps && x.type !== 'warmup')
                  .map((x) => estimate1RM(x.weightKg!, x.reps!).value)
                return best.length ? (
                  <p className="text-subtle mt-2 font-mono text-[12px]">
                    {t('e1rm')}: {lb ? toLb(Math.max(...best)) : Math.max(...best)} {s.units}
                  </p>
                ) : null
              })()}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => s.addSet(e.id)}
                  className="btn btn-ghost !py-1.5 !text-[14px]"
                  data-testid="add-set"
                >
                  <Plus size={15} aria-hidden /> {t('addSet')}
                </button>
                <input
                  aria-label={t('notes')}
                  placeholder={t('notes')}
                  value={e.notes}
                  onChange={(ev) => s.setExerciseNotes(e.id, ev.target.value)}
                  className="field !w-auto flex-1 !py-1.5 !text-[14px]"
                />
              </div>
            </li>
          )
        })}
      </ol>

      <button
        type="button"
        onClick={() => setPicker(true)}
        className="btn btn-ghost mt-4 w-full"
        data-testid="add-exercise"
      >
        <Plus size={16} aria-hidden /> {t('addExercise')}
      </button>
      <textarea
        aria-label={t('notes')}
        placeholder={t('notes')}
        value={a.notes}
        onChange={(e) => s.setNotes(e.target.value)}
        rows={2}
        className="field mt-4"
      />
      <button
        type="button"
        onClick={() => {
          if (confirm(t('discardConfirm'))) {
            s.discard()
            router.replace(home)
          }
        }}
        className="mt-6 text-[14px] text-[#ff9b9b] underline-offset-4 hover:underline"
      >
        {t('discard')}
      </button>

      {picker && (
        <ExercisePicker
          onClose={() => setPicker(false)}
          onPick={(slug) => {
            s.addExercise(slug)
            setPicker(false)
          }}
        />
      )}
      {plates !== null && <PlateCalculator initial={plates} onClose={() => setPlates(null)} />}
      <RestTimer />
    </div>
  )
}
