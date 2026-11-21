import Link from '@/components/ui/Link'
import { getTranslations } from 'next-intl/server'
import { ArrowLeft } from 'lucide-react'
import { requireAppUser } from '@/lib/auth'
import { gate } from '@/lib/plan'
import { Paywall } from '@/components/app/Paywall'
import { PhotoJournal, type PhotoItem, type Pose } from '@/components/body/PhotoJournal'

type Db = { from: (t: string) => any } // eslint-disable-line @typescript-eslint/no-explicit-any

export async function generateMetadata() {
  const t = await getTranslations('photos')
  return { title: t('title'), robots: { index: false } }
}

/** Nearest weigh-in within ±3 days of a date, so photos show the weight at that time. */
function nearestWeight(date: string, weights: { measured_at: string; weight_kg: number }[]): number | null {
  const t = Date.parse(date)
  let best: { d: number; w: number } | null = null
  for (const r of weights) {
    const d = Math.abs(Date.parse(r.measured_at) - t)
    if (d <= 3 * 864e5 && (!best || d < best.d)) best = { d, w: Number(r.weight_kg) }
  }
  return best?.w ?? null
}

export default async function PhotosPage() {
  const s = await requireAppUser()
  const db = s.supabase as unknown as Db
  const t = await getTranslations('photos')
  const access = await gate(s.supabase, s.user.id, 'photos')
  if (!access.allowed)
    return (
      <div className="space-y-8">
        <h1 className="display text-[44px] md:text-[56px]">{t('title')}</h1>
        <Paywall feature="photos" />
      </div>
    )
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Prague' })

  const [{ data: rows }, { data: weights }] = await Promise.all([
    db
      .from('progress_photos')
      .select('id, taken_at, storage_path, pose, notes')
      .order('taken_at', { ascending: false })
      .limit(300),
    db.from('body_measurements').select('measured_at, weight_kg').not('weight_kg', 'is', null),
  ])
  const list = (rows ?? []) as {
    id: string
    taken_at: string
    storage_path: string
    pose: Pose | null
    notes: string | null
  }[]

  // short-lived signed links: the bucket is private and links stop working after an hour
  const signed = list.length
    ? ((
        await s.supabase.storage.from('progress-photos').createSignedUrls(
          list.map((r) => r.storage_path),
          3600,
        )
      ).data ?? [])
    : []
  const urlByPath = new Map(signed.map((x) => [x.path, x.signedUrl]))

  const photos: PhotoItem[] = list.map((r) => ({
    id: r.id,
    taken_at: r.taken_at,
    pose: r.pose,
    notes: r.notes,
    url: urlByPath.get(r.storage_path) ?? null,
    weightKg: nearestWeight(r.taken_at, weights ?? []),
  }))

  return (
    <div className="space-y-8">
      <div>
        <Link href="/body" className="text-subtle hover:text-fg inline-flex items-center gap-1.5 text-[14px]">
          <ArrowLeft size={15} aria-hidden /> {t('back')}
        </Link>
        <h1 className="display mt-2 text-[44px] md:text-[56px]">{t('title')}</h1>
        <p className="text-muted mt-2 max-w-2xl text-[15px]">{t('intro')}</p>
      </div>
      <PhotoJournal photos={photos} userId={s.user.id} today={today} />
    </div>
  )
}
