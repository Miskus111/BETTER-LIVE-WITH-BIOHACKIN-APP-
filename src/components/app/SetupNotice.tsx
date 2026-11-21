import Link from '@/components/ui/Link'
import { getTranslations } from 'next-intl/server'
import { DatabaseZap } from 'lucide-react'

export async function SetupNotice() {
  const t = await getTranslations('setup')
  return (
    <div className="mx-auto flex min-h-svh max-w-lg flex-col items-center justify-center px-6 text-center">
      <DatabaseZap size={36} className="text-cyan" aria-hidden />
      <h1 className="display mt-5 text-[38px]">{t('title')}</h1>
      <p className="text-muted mt-3 text-[15px]">{t('text')}</p>
      <Link href="/" className="btn btn-ghost mt-8">
        {t('browse')}
      </Link>
    </div>
  )
}
