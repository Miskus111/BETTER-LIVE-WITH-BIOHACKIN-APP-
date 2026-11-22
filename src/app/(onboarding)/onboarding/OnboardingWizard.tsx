'use client'

import { useSafeTransition } from '@/lib/useSafeTransition'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { ArrowLeft, Check, Loader2, ShieldCheck } from 'lucide-react'
import type { z } from 'zod'
import {
  ALLERGIES,
  BUDGETS,
  DIETS,
  EQUIPMENT,
  EXPERIENCE,
  GOALS,
  PAIN_AREAS,
  SPORTS,
  WORK,
} from '@/lib/onboarding/options'
import {
  aboutSchema,
  consentSchema,
  dietSchema,
  goalsSchema,
  healthSchema,
  sportSchema,
  trainingSchema,
  type OnboardingInput,
} from '@/lib/onboarding/schema'
import { cx } from '@/lib/format'
import { saveOnboarding } from './actions'

type Mutable<T> = { -readonly [K in keyof T]: T[K] extends readonly (infer U)[] ? U[] : T[K] }
export type WizardInitial = Mutable<Partial<OnboardingInput>> & Record<string, unknown>

const STEPS = ['about', 'goals', 'sport', 'training', 'diet', 'health', 'consent'] as const
type Step = (typeof STEPS)[number]
const SCHEMAS: Record<Step, z.ZodType> = {
  about: aboutSchema,
  goals: goalsSchema,
  sport: sportSchema,
  training: trainingSchema,
  diet: dietSchema,
  health: healthSchema,
  consent: consentSchema,
}

export function OnboardingWizard({
  initial,
  startAtConsent,
}: {
  initial: WizardInitial
  startAtConsent: boolean
}) {
  const t = useTranslations('onboarding')
  const c = useTranslations('common')
  const router = useRouter()
  const [i, setI] = useState(startAtConsent ? STEPS.length - 1 : 0)
  const [v, setV] = useState<WizardInitial>(initial)
  const [errors, setErrors] = useState<Set<string>>(new Set())
  const [saveError, setSaveError] = useState(false)
  const [pending, start] = useSafeTransition(() => setSaveError(true))
  const step = STEPS[i]

  const set = (k: string, val: unknown) => setV((s) => ({ ...s, [k]: val }))
  const toggle = (k: string, id: string, exclusive?: string) =>
    setV((s) => {
      const cur = (s[k] as string[] | undefined) ?? []
      let next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
      if (exclusive)
        next =
          id === exclusive
            ? next.includes(exclusive)
              ? [exclusive]
              : []
            : next.filter((x) => x !== exclusive)
      return { ...s, [k]: next }
    })

  const next = () => {
    const r = SCHEMAS[step].safeParse(v)
    if (!r.success) {
      setErrors(new Set(r.error.issues.map((x) => String(x.path[0]))))
      return
    }
    setErrors(new Set())
    if (i < STEPS.length - 1) {
      setI(i + 1)
      window.scrollTo({ top: 0 })
      return
    }
    start(async () => {
      setSaveError(false)
      const res = await saveOnboarding(v as OnboardingInput)
      if (res.ok) {
        router.replace('/today')
        router.refresh()
      } else setSaveError(true)
    })
  }

  const err = (k: string) => errors.has(k)

  return (
    <div className="mx-auto max-w-xl px-5 pt-4 pb-32">
      <p className="text-subtle font-mono text-[12px] uppercase">
        {t('step', { current: i + 1, total: STEPS.length })}
      </p>
      <div className="mt-2 flex gap-1" aria-hidden>
        {STEPS.map((s, k) => (
          <span key={s} className={cx('h-1 flex-1 rounded-full', k <= i ? 'bg-cyan' : 'bg-white/10')} />
        ))}
      </div>

      <h1 className="display mt-6 text-[40px]">{t(`${step}.title`)}</h1>

      <div className="mt-6 grid gap-6" data-testid={`step-${step}`}>
        {step === 'about' && (
          <>
            <p className="text-muted -mt-3 text-[15px]">{t('about.subtitle')}</p>
            <Field label={t('about.displayName')} invalid={err('displayName')}>
              <input
                className="field"
                value={(v.displayName as string) ?? ''}
                onChange={(e) => set('displayName', e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field
                label={t('about.birthDate')}
                invalid={err('birthDate')}
                hint={err('birthDate') ? t('about.underage') : undefined}
              >
                <input
                  type="date"
                  className="field"
                  value={(v.birthDate as string) ?? ''}
                  onChange={(e) => set('birthDate', e.target.value)}
                />
              </Field>
              <Field label={t('about.sex')} invalid={err('sex')}>
                <Chips
                  options={['female', 'male']}
                  label={(o) => t(o === 'female' ? 'about.sexFemale' : 'about.sexMale')}
                  value={v.sex ? [v.sex as string] : []}
                  onToggle={(o) => set('sex', o)}
                />
              </Field>
              <Field label={t('about.height')} invalid={err('heightCm')}>
                <input
                  inputMode="decimal"
                  className="field"
                  value={(v.heightCm as string) ?? ''}
                  onChange={(e) => set('heightCm', e.target.value)}
                />
              </Field>
              <Field label={t('about.weight')} invalid={err('weightKg')}>
                <input
                  inputMode="decimal"
                  className="field"
                  value={(v.weightKg as string) ?? ''}
                  onChange={(e) => set('weightKg', e.target.value)}
                />
              </Field>
            </div>
            <Check2
              checked={v.adultConfirmed === true}
              onChange={(b) => set('adultConfirmed', b || undefined)}
              invalid={err('adultConfirmed')}
            >
              {t('about.adult')}
            </Check2>
          </>
        )}

        {step === 'goals' && (
          <>
            <p className="text-muted -mt-3 text-[15px]">{t('goals.subtitle')}</p>
            <Chips
              options={GOALS}
              label={(o) => t(`goals.${o}`)}
              value={(v.goals as string[]) ?? []}
              onToggle={(o) => toggle('goals', o)}
              invalid={err('goals')}
              big
            />
          </>
        )}

        {step === 'sport' && (
          <>
            <Field label={t('sport.sports')} invalid={err('sports')}>
              <Chips
                options={SPORTS}
                label={(o) => t(`options.sports.${o}`)}
                value={(v.sports as string[]) ?? []}
                onToggle={(o) => toggle('sports', o)}
              />
            </Field>
            <Field label={t('sport.experience')} invalid={err('experience')}>
              <Chips
                options={EXPERIENCE}
                label={(o) => t(`sport.${o}`)}
                value={v.experience ? [v.experience as string] : []}
                onToggle={(o) => set('experience', o)}
              />
            </Field>
          </>
        )}

        {step === 'training' && (
          <>
            <Field label={t('training.days')} invalid={err('trainingDays')}>
              <Chips
                options={['1', '2', '3', '4', '5', '6', '7']}
                label={(o) => o}
                value={[String(v.trainingDays ?? '')]}
                onToggle={(o) => set('trainingDays', o)}
              />
            </Field>
            <Field label={t('training.minutes')} invalid={err('sessionMinutes')}>
              <Chips
                options={['20', '30', '45', '60', '75', '90', '120']}
                label={(o) => `${o} min`}
                value={[String(v.sessionMinutes ?? '')]}
                onToggle={(o) => set('sessionMinutes', o)}
              />
            </Field>
            <Field label={t('training.equipment')} invalid={err('equipment')}>
              <Chips
                options={EQUIPMENT}
                label={(o) => t(`options.equipment.${o}`)}
                value={(v.equipment as string[]) ?? []}
                onToggle={(o) => toggle('equipment', o, 'none')}
              />
            </Field>
          </>
        )}

        {step === 'diet' && (
          <>
            <Field label={t('diet.type')} invalid={err('dietType')}>
              <Chips
                options={DIETS}
                label={(o) => t(`options.diet.${o}`)}
                value={v.dietType ? [v.dietType as string] : []}
                onToggle={(o) => set('dietType', o)}
              />
            </Field>
            <Field label={t('diet.allergies')}>
              <Chips
                options={ALLERGIES}
                label={(o) => t(`options.allergies.${o}`)}
                value={(v.allergies as string[]) ?? []}
                onToggle={(o) => toggle('allergies', o)}
              />
            </Field>
            <Field label={t('diet.allergiesOther')}>
              <input
                className="field"
                value={(v.allergiesOther as string) ?? ''}
                onChange={(e) => set('allergiesOther', e.target.value)}
              />
            </Field>
            <Field label={t('diet.dislikes')}>
              <input
                className="field"
                value={(v.dislikes as string) ?? ''}
                onChange={(e) => set('dislikes', e.target.value)}
              />
            </Field>
            <Field label={t('diet.budget')} invalid={err('budget')}>
              <Chips
                options={BUDGETS}
                label={(o) => t(`diet.budget_${o}`)}
                value={v.budget ? [v.budget as string] : []}
                onToggle={(o) => set('budget', o)}
              />
            </Field>
          </>
        )}

        {step === 'health' && (
          <>
            <Field label={t('health.pain')}>
              <Chips
                options={PAIN_AREAS}
                label={(o) => t(`options.pain.${o}`)}
                value={(v.painAreas as string[]) ?? []}
                onToggle={(o) => toggle('painAreas', o, 'none')}
              />
            </Field>
            <Field label={`${t('health.medications')} (${c('optional')})`} hint={t('health.medicationsHint')}>
              <textarea
                rows={2}
                className="field"
                value={(v.medications as string) ?? ''}
                onChange={(e) => set('medications', e.target.value)}
              />
            </Field>
            <Field label={t('health.sleep')} invalid={err('sleepHours')}>
              <Chips
                options={['5', '6', '7', '8', '9']}
                label={(o) => `${o} h`}
                value={[String(v.sleepHours ?? '')]}
                onToggle={(o) => set('sleepHours', o)}
              />
            </Field>
            <Field label={t('health.work')} invalid={err('workPattern')}>
              <Chips
                options={WORK}
                label={(o) => t(`options.work.${o}`)}
                value={v.workPattern ? [v.workPattern as string] : []}
                onToggle={(o) => set('workPattern', o)}
              />
            </Field>
          </>
        )}

        {step === 'consent' && (
          <>
            <div className="card p-5">
              <ShieldCheck size={22} className="text-cyan" aria-hidden />
              <p className="mt-3 text-[15px]">{t('consent.intro')}</p>
              <ul className="text-muted mt-3 space-y-1.5 text-[14.5px]">
                {(t.raw('consent.points') as string[]).map((p) => (
                  <li key={p} className="flex gap-2">
                    <Check size={16} className="text-bio mt-0.5 shrink-0" aria-hidden />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <Check2
              checked={v.healthData === true}
              onChange={(b) => set('healthData', b || undefined)}
              invalid={err('healthData')}
              testId="consent-health"
            >
              {t('consent.health')}
            </Check2>
            <Check2
              checked={v.terms === true}
              onChange={(b) => set('terms', b || undefined)}
              invalid={err('terms')}
              testId="consent-terms"
            >
              {t('consent.terms')}
            </Check2>
            {err('healthData') && <p className="text-warn text-[14px]">{t('consent.required')}</p>}
            <p className="text-subtle text-[13px]">{t('consent.notMedical')}</p>
          </>
        )}
      </div>

      {saveError && (
        <p role="alert" className="mt-6 text-[14px] text-[#ff9b9b]">
          {t('saveError')}
        </p>
      )}

      <div className="border-line bg-ink/90 fixed inset-x-0 bottom-0 border-t px-5 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          {i > 0 && (
            <button
              type="button"
              onClick={() => setI(i - 1)}
              className="btn btn-ghost"
              aria-label={c('back')}
            >
              <ArrowLeft size={16} aria-hidden />
            </button>
          )}
          <button
            type="button"
            onClick={next}
            disabled={pending}
            className="btn btn-primary flex-1"
            data-testid="onboarding-next"
          >
            {pending && <Loader2 size={16} className="animate-spin" aria-hidden />}
            {pending ? t('saving') : i === STEPS.length - 1 ? t('finish') : c('continue')}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  invalid,
  hint,
  children,
}: {
  label: string
  invalid?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-2">
      <span className={cx('text-[14.5px]', invalid ? 'text-[#ff9b9b]' : 'text-muted')}>{label}</span>
      {children}
      {hint && (
        <span className={cx('text-[12.5px]', invalid ? 'text-[#ff9b9b]' : 'text-subtle')}>{hint}</span>
      )}
    </div>
  )
}

function Chips({
  options,
  label,
  value,
  onToggle,
  invalid,
  big,
}: {
  options: readonly string[]
  label: (o: string) => string
  value: string[]
  onToggle: (o: string) => void
  invalid?: boolean
  big?: boolean
}) {
  return (
    <div
      className={cx(
        'flex flex-wrap gap-2',
        invalid && 'rounded-xl ring-1 ring-[#ff8b8b]/50 ring-offset-4 ring-offset-transparent',
      )}
    >
      {options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={value.includes(o)}
          onClick={() => onToggle(o)}
          className={cx('chip', big && '!px-4 !py-2 !text-[15px]')}
        >
          {label(o)}
        </button>
      ))}
    </div>
  )
}

function Check2({
  checked,
  onChange,
  invalid,
  testId,
  children,
}: {
  checked: boolean
  onChange: (b: boolean) => void
  invalid?: boolean
  testId?: string
  children: React.ReactNode
}) {
  return (
    <label
      className={cx(
        'flex cursor-pointer gap-3 rounded-xl border p-4 text-[15px]',
        invalid ? 'border-[#ff8b8b]/50' : 'border-line',
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-cyan mt-1 h-4 w-4"
        data-testid={testId}
      />
      <span>{children}</span>
    </label>
  )
}
