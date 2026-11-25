import { getTranslations } from 'next-intl/server'

/** First Tab stop on every app screen: jumps past the navigation to the screen's content (#main). */
export async function SkipLink() {
  const t = await getTranslations('common')
  return (
    <a
      href="#main"
      className="bg-cyan text-ink sr-only z-[80] rounded-full px-4 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
    >
      {t('skipToContent')}
    </a>
  )
}
