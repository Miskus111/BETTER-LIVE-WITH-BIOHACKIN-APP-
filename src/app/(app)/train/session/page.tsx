import { getTranslations } from 'next-intl/server'
import { WorkoutLogger } from '@/components/train/WorkoutLogger'

export async function generateMetadata() {
  const t = await getTranslations('train')
  return { title: t('sessionTitle') }
}

export default function SessionPage() {
  return <WorkoutLogger />
}
