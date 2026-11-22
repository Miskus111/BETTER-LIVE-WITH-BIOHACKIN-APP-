import { getTranslations } from 'next-intl/server'
import { requireAppUser } from '@/lib/auth'
import { PILLARS } from '@/data/looksmaxing'
import { LooksHabits } from '@/components/looks/LooksHabits'

export default async function LooksPage() {
  await requireAppUser()
  const t = await getTranslations('looks')
  const habits = PILLARS.map((p) => ({
    id: p.id,
    title: p.title,
    howTo: p.howTo[0] ?? p.lead,
    level: p.level,
  }))
  return (
    <div>
      <h1 className="display mb-4 text-[44px] md:text-[56px]">{t('title')}</h1>
      <LooksHabits habits={habits} />
    </div>
  )
}
