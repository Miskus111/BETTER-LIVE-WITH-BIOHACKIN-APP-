import { getTranslations } from 'next-intl/server'
import { ExerciseLibrary } from '@/components/train/ExerciseLibrary'

export async function generateMetadata() {
  const t = await getTranslations('train')
  return { title: t('library') }
}

export default async function ExercisesPage() {
  const t = await getTranslations('train')
  return (
    <div>
      <h1 className="display mb-6 text-[44px]">{t('library')}</h1>
      <ExerciseLibrary />
    </div>
  )
}
