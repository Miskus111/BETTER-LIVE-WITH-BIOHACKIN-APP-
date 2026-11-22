'use client' // error boundaries must be client components

import { useTranslations } from 'next-intl'
import { useEffect } from 'react'
import Link from '@/components/ui/Link'

/** A screen failed to render: the app shell stays, the user can retry or go back to Today. */
export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  const t = useTranslations('common')
  useEffect(() => {
    console.error(error)
  }, [error])
  return (
    <div className="mx-auto max-w-xl py-16 text-center" role="alert">
      <h1 className="display text-[40px]">{t('errorTitle')}</h1>
      <p className="text-muted mt-3 text-[15px]">{t('errorBody')}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={() => retry()} className="btn btn-primary">
          {t('retry')}
        </button>
        <Link href="/today" className="btn btn-ghost">
          {t('backToToday')}
        </Link>
      </div>
    </div>
  )
}
