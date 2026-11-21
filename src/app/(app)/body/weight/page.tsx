import Link from '@/components/ui/Link'
import { getTranslations } from 'next-intl/server'
import { ArrowLeft } from 'lucide-react'
import { requireAppUser } from '@/lib/auth'
import { eatingRiskSignals } from '@/lib/eat/targets'
import { WeightTracker, type MeasurementRow } from '@/components/body/WeightTracker'

type Db = { from: (t: string) => any } // eslint-disable-line @typescript-eslint/no-explicit-any

export async function generateMetadata() {
  const t = await getTranslations('weight')
  return { title: t('title') }
}

export default async function WeightPage() {
  const s = await requireAppUser()
  const db = s.supabase as unknown as Db
  const t = await getTranslations('weight')
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Prague' })

  const [{ data: rows }, { data: goalRows }] = await Promise.all([
    db
      .from('body_measurements')
      .select('id, measured_at, weight_kg, waist_cm, hips_cm, chest_cm, arm_cm, thigh_cm')
      .order('measured_at', { ascending: true })
      .limit(1000),
    db.from('goals').select('goal'),
  ])
  const goals = (goalRows ?? []).map((g: { goal: string }) => g.goal)
  const p = s.profile as { weight_kg?: number | null; height_cm?: number | null } | null
  // with any eating-disorder risk signal, weight changes are shown neutrally (no "good"/"bad" colour)
  const risk =
    p?.weight_kg && p?.height_cm
      ? eatingRiskSignals({ weightKg: Number(p.weight_kg), heightCm: Number(p.height_cm), goals }).length > 0
      : false
  const goal = risk
    ? 'keep'
    : goals.includes('fat_loss')
      ? 'lose'
      : goals.includes('muscle')
        ? 'gain'
        : 'keep'

  return (
    <div className="space-y-8">
      <div>
        <Link href="/body" className="text-subtle hover:text-fg inline-flex items-center gap-1.5 text-[14px]">
          <ArrowLeft size={15} aria-hidden /> {t('back')}
        </Link>
        <h1 className="display mt-2 text-[44px] md:text-[56px]">{t('title')}</h1>
        <p className="text-muted mt-2 max-w-2xl text-[15px]">{t('intro')}</p>
      </div>
      <WeightTracker rows={(rows ?? []) as MeasurementRow[]} today={today} goal={goal} />
      <p className="text-subtle max-w-2xl text-[13px]">{t('note')}</p>
    </div>
  )
}
