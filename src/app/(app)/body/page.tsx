import Link from '@/components/ui/Link'
import { getTranslations } from 'next-intl/server'
import { ArrowRight, Camera, ExternalLink, Scale } from 'lucide-react'
import { ProBadge } from '@/components/app/ProBadge'
import { webUrl } from '@/lib/web'

export async function generateMetadata() {
  const t = await getTranslations('nav')
  return { title: t('body') }
}

/** Body tab: the user's own body data. The interactive anatomy (organs, nutrients) is educational and lives on the website. */
export default async function BodyPage() {
  const t = await getTranslations('nav')
  const w = await getTranslations('weight')
  const ph = await getTranslations('photos')
  const links = [
    {
      href: '/body/weight',
      icon: Scale,
      title: w('bodyLink'),
      hint: w('bodyLinkHint'),
      id: 'weight-link',
      pro: false,
    },
    {
      href: '/body/photos',
      icon: Camera,
      title: ph('bodyLink'),
      hint: ph('bodyLinkHint'),
      id: 'photos-link',
    },
    {
      href: webUrl('/'),
      icon: ExternalLink,
      title: t('bodyMap'),
      hint: t('bodyMapHint'),
      id: 'body-map-link',
    },
  ]
  return (
    <div className="-mx-4 md:-mx-8">
      <h1 className="sr-only">{t('body')}</h1>
      <div className="grid gap-3 px-4 pt-1 pb-3 sm:grid-cols-2 md:px-8 lg:grid-cols-3">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="card hover:border-cyan/40 flex items-center gap-3 p-4 transition"
            data-testid={l.id}
          >
            <l.icon size={20} className="text-cyan shrink-0" aria-hidden />
            <span className="flex-1">
              <span className="block text-[15px] font-medium">
                {l.title} {l.pro && <ProBadge className="ml-1 align-middle" />}
              </span>
              <span className="text-subtle block text-[13px]">{l.hint}</span>
            </span>
            <ArrowRight size={17} className="text-cyan" aria-hidden />
          </Link>
        ))}
      </div>
    </div>
  )
}
