'use client'

import Link from '@/components/ui/Link'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { AlertOctagon, CheckCircle2, Phone, Stethoscope } from 'lucide-react'
import { EDUCATION, MOBILITY_BY_SLUG, REGION_PLAN } from '@/data/mobility'
import { FLAGS_BY_REGION, triage, type RedFlag, type Region } from '@/lib/pain/red-flags'
import { createClient } from '@/lib/supabase/client'
import { useSafeTransition } from '@/lib/useSafeTransition'
import { cx } from '@/lib/format'

type Step = 'score' | 'flags' | 'gate' | 'questions' | 'plan'
const FACTORS = [
  'movement',
  'rest',
  'heat',
  'sitting',
  'standing',
  'lifting',
  'training',
  'morning',
  'stress',
] as const
type Db = { from: (t: string) => any } // eslint-disable-line @typescript-eslint/no-explicit-any

export function PainFlow({ region }: { region: Region }) {
  const t = useTranslations('mob')
  const locale = useLocale() as 'cs' | 'en'
  const [step, setStep] = useState<Step>('score')
  const [score, setScore] = useState(5)
  const [flags, setFlags] = useState<Partial<Record<RedFlag, boolean>>>({})
  const [a, setA] = useState({
    onset: '',
    duration: '',
    better: [] as string[],
    worse: [] as string[],
    desk: null as boolean | null,
    load: null as boolean | null,
  })
  const [saved, setSaved] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  // a failed save must never hide the safety message — it only says the report wasn't stored
  const [pending, start] = useSafeTransition(() => setSaveFailed(true))
  const questions = FLAGS_BY_REGION[region]
  const result = triage(flags)

  const save = (redFlags: RedFlag[]) =>
    start(async () => {
      const db = createClient() as unknown as Db
      const { error } = await db
        .from('pain_reports')
        .insert({ region, score, answers: a, red_flags: redFlags })
      if (!error) setSaved(true)
      else setSaveFailed(true)
    })

  const toggle = (k: 'better' | 'worse', v: string) =>
    setA((s) => ({ ...s, [k]: s[k].includes(v) ? s[k].filter((x) => x !== v) : [...s[k], v] }))

  return (
    <div className="max-w-2xl">
      <Link href="/mobility" className="link text-[14px]">
        ← {t('title')}
      </Link>
      <h1 className="display mt-3 text-[40px]">{t(`regions.${region}`)}</h1>

      {step === 'score' && (
        <section className="card mt-6 p-5">
          <label htmlFor="score" className="text-[15px]">
            {t('scoreQ')}
          </label>
          <input
            id="score"
            type="range"
            min={0}
            max={10}
            value={score}
            onChange={(e) => setScore(Number(e.target.value))}
            className="accent-cyan mt-4 w-full"
          />
          <p className="mt-2 font-mono text-[28px]">{score}/10</p>
          <button
            type="button"
            className="btn btn-primary mt-4"
            onClick={() => setStep('flags')}
            data-testid="pain-next"
          >
            {t('next')}
          </button>
        </section>
      )}

      {step === 'flags' && (
        <section className="card mt-6 p-5" data-testid="red-flags">
          <h2 className="text-[18px] font-medium">{t('flagsTitle')}</h2>
          <p className="text-muted mt-1 text-[14.5px]">{t('flagsIntro')}</p>
          <ul className="mt-4 space-y-3">
            {questions.map((f) => (
              <li key={f} className="border-line rounded-xl border p-3">
                <p className="text-[14.5px]">{t(`flags.${f}`)}</p>
                <div className="mt-2 flex gap-2" role="radiogroup" aria-label={t(`flags.${f}`)}>
                  {[true, false].map((v) => (
                    <button
                      key={String(v)}
                      type="button"
                      role="radio"
                      aria-checked={flags[f] === v}
                      onClick={() => setFlags((s) => ({ ...s, [f]: v }))}
                      className="chip"
                      data-testid={`flag-${f}-${v ? 'yes' : 'no'}`}
                    >
                      {v ? t('yes') : t('no')}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn btn-primary mt-4"
            disabled={questions.some((f) => flags[f] === undefined)}
            onClick={() => {
              const r = triage(flags)
              if (r.action === 'exercise') setStep('questions')
              else {
                setStep('gate')
                save(r.flags)
              }
            }}
            data-testid="flags-next"
          >
            {t('next')}
          </button>
        </section>
      )}

      {step === 'gate' && result.action !== 'exercise' && (
        <section
          role="alert"
          data-testid={`gate-${result.action}`}
          className={cx(
            'mt-6 rounded-2xl border p-6',
            result.action === 'emergency'
              ? 'border-[#ff8b8b]/50 bg-[#ff8b8b]/[0.08]'
              : 'border-warn/40 bg-warn/[0.06]',
          )}
        >
          {result.action === 'emergency' ? (
            <AlertOctagon size={30} className="text-[#ff9b9b]" aria-hidden />
          ) : (
            <Stethoscope size={30} className="text-warn" aria-hidden />
          )}
          <h2 className="mt-3 text-[22px] font-medium">
            {result.action === 'emergency' ? t('emergencyTitle') : t('doctorTitle')}
          </h2>
          <p className="mt-2 text-[15px]">
            {result.action === 'emergency' ? t('emergencyText') : t('doctorText')}
          </p>
          <ul className="text-muted mt-3 list-disc space-y-1 pl-5 text-[14px]">
            {result.flags.map((f) => (
              <li key={f}>{t(`flags.${f}`)}</li>
            ))}
          </ul>
          {result.action === 'emergency' && (
            <a href="tel:155" className="btn btn-primary mt-5">
              <Phone size={16} aria-hidden /> 155 / 112
            </a>
          )}
        </section>
      )}

      {saveFailed && (
        <p className="text-warn mt-3 text-[13.5px]" role="status" data-testid="pain-save-failed">
          {t('saveError')}
        </p>
      )}

      {step === 'questions' && (
        <section className="card mt-6 grid gap-5 p-5">
          <Q
            label={t('qOnset')}
            options={['sudden', 'gradual', 'unknown'].map((o) => [o, t(`onset_${o}`)])}
            value={a.onset}
            onPick={(v) => setA((s) => ({ ...s, onset: v }))}
          />
          <Q
            label={t('qDuration')}
            options={['days', 'weeks', 'months'].map((o) => [o, t(`dur_${o}`)])}
            value={a.duration}
            onPick={(v) => setA((s) => ({ ...s, duration: v }))}
          />
          <Multi
            label={t('qBetter')}
            options={FACTORS.map((f) => [f, t(`f_${f}`)])}
            value={a.better}
            onToggle={(v) => toggle('better', v)}
          />
          <Multi
            label={t('qWorse')}
            options={FACTORS.map((f) => [f, t(`f_${f}`)])}
            value={a.worse}
            onToggle={(v) => toggle('worse', v)}
          />
          <Q
            label={t('qDesk')}
            options={[
              ['y', t('yes')],
              ['n', t('no')],
            ]}
            value={a.desk === null ? '' : a.desk ? 'y' : 'n'}
            onPick={(v) => setA((s) => ({ ...s, desk: v === 'y' }))}
          />
          <Q
            label={t('qLoad')}
            options={[
              ['y', t('yes')],
              ['n', t('no')],
            ]}
            value={a.load === null ? '' : a.load ? 'y' : 'n'}
            onPick={(v) => setA((s) => ({ ...s, load: v === 'y' }))}
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setStep('plan')}
            data-testid="questions-next"
          >
            {t('next')}
          </button>
        </section>
      )}

      {step === 'plan' && (
        <div className="mt-6 space-y-5" data-testid="pain-plan">
          <section className="card p-5">
            <h2 className="eyebrow mb-2">{t('education')}</h2>
            <ul className="space-y-2">
              {EDUCATION[region].factors.map((f) => (
                <li key={f.en} className="border-cyan/40 border-l-2 pl-3 text-[15px]">
                  {f[locale]}
                </li>
              ))}
              {a.desk && (
                <li className="border-cyan/40 border-l-2 pl-3 text-[15px]">
                  {locale === 'cs'
                    ? 'Při práci vsedě pomáhají krátké pohybové přestávky každých 30–60 minut.'
                    : 'With desk work, short movement breaks every 30–60 minutes help.'}
                </li>
              )}
              {a.load && (
                <li className="border-cyan/40 border-l-2 pl-3 text-[15px]">
                  {locale === 'cs'
                    ? 'Nedávná změna zátěže je častý spouštěč — zvyšujte ji postupně (max. o 10–20 % týdně).'
                    : 'A recent load change is a common trigger — increase load gradually (about 10–20 % per week).'}
                </li>
              )}
            </ul>
            <p className="text-subtle mt-3 text-[13px]">{t('notDiagnosis')}</p>
            <p className="mt-3 text-[14.5px]">
              <strong className="font-medium">{t('seeA')}:</strong> {EDUCATION[region].seeA[locale]}
            </p>
          </section>
          <section className="card p-5">
            <h2 className="eyebrow mb-3">{t('plan')}</h2>
            <ol className="space-y-4">
              {REGION_PLAN[region].map((stage, i) => (
                <li key={i}>
                  <p className="text-cyan font-mono text-[13px]">
                    {t('stage')} {i + 1}
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {stage.map((s) => {
                      const m = MOBILITY_BY_SLUG[s]
                      return (
                        <li key={s} className="text-[14.5px]">
                          <span className="font-medium">{m.name[locale]}</span>{' '}
                          <span className="text-subtle font-mono text-[12.5px]">
                            {m.reps ? `${m.reps}×` : `${m.seconds} s`}
                          </span>
                          <span className="text-muted block text-[13.5px]">{m.how[locale]}</span>
                        </li>
                      )
                    })}
                  </ul>
                </li>
              ))}
            </ol>
            <p className="text-subtle mt-4 text-[13px]">{t('stageRule')}</p>
          </section>
          {saved ? (
            <p className="text-bio flex items-center gap-2" role="status">
              <CheckCircle2 size={17} aria-hidden /> {t('saved')}
            </p>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              disabled={pending}
              onClick={() => save([])}
              data-testid="pain-save"
            >
              {t('save')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function Q({
  label,
  options,
  value,
  onPick,
}: {
  label: string
  options: string[][]
  value: string
  onPick: (v: string) => void
}) {
  return (
    <div>
      <p className="text-muted mb-2 text-[14.5px]">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(([v, l]) => (
          <button key={v} type="button" aria-pressed={value === v} onClick={() => onPick(v)} className="chip">
            {l}
          </button>
        ))}
      </div>
    </div>
  )
}

function Multi({
  label,
  options,
  value,
  onToggle,
}: {
  label: string
  options: string[][]
  value: string[]
  onToggle: (v: string) => void
}) {
  return (
    <div>
      <p className="text-muted mb-2 text-[14.5px]">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(([v, l]) => (
          <button
            key={v}
            type="button"
            aria-pressed={value.includes(v)}
            onClick={() => onToggle(v)}
            className="chip"
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  )
}
