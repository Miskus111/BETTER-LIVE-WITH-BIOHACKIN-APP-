import { getTranslations } from 'next-intl/server'
import { requireAppUser } from '@/lib/auth'
import { isAiConfigured } from '@/lib/ai/client'
import { LabsClient, type BodyComp, type LabReportRow, type LabValue } from '@/components/labs/LabsClient'

export async function generateMetadata() {
  const t = await getTranslations('nav')
  return { title: t('labs') }
}

type Db = { from: (t: string) => any } // eslint-disable-line @typescript-eslint/no-explicit-any

export default async function LabsPage() {
  const { supabase } = await requireAppUser()
  const db = supabase as unknown as Db
  const t = await getTranslations('labs')
  const [{ data: values }, { data: comps }, { data: reports }] = await Promise.all([
    db
      .from('lab_values')
      .select('marker, value, unit, flag, taken_on, ref_low, ref_high')
      .eq('confirmed', true)
      .order('taken_on', { ascending: true }),
    db
      .from('body_composition')
      .select('measured_on, weight_kg, skeletal_muscle_kg, body_fat_pct, visceral_fat_level')
      .eq('confirmed', true)
      .order('measured_on', { ascending: false }),
    db
      .from('lab_reports')
      .select('id, kind, taken_on, lab_name')
      .order('taken_on', { ascending: false })
      .limit(50),
  ])
  // numeric columns arrive as strings from PostgREST
  const num = <T extends object>(r: T, keys: (keyof T)[]): T => {
    const o = { ...r } as Record<keyof T, unknown>
    for (const k of keys) if (o[k] !== null && o[k] !== undefined) o[k] = Number(o[k])
    return o as T
  }
  return (
    <div>
      <h1 className="display mb-4 text-[44px] md:text-[56px]">{t('title')}</h1>
      <LabsClient
        values={((values ?? []) as LabValue[]).map((v) => num(v, ['value', 'ref_low', 'ref_high']))}
        comps={((comps ?? []) as BodyComp[]).map((c) =>
          num(c, ['weight_kg', 'skeletal_muscle_kg', 'body_fat_pct', 'visceral_fat_level']),
        )}
        reports={(reports ?? []) as LabReportRow[]}
        aiEnabled={isAiConfigured()}
      />
    </div>
  )
}
