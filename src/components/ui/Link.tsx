import NextLink from 'next/link'
import type { ComponentProps } from 'react'
import { webUrl } from '@/lib/web'

/** Paths served by the public website (keep in sync with PUBLIC_PATHS in next.config.ts). */
const PUBLIC =
  /^\/(food|potraviny|organ|jak-funguje-telo|doplnky|looksmaxing|science|nastroje|privacy|terms|pricing|jak-doporucujeme)(\/|#|\?|$)/

export const isPublicPath = (href: string) => PUBLIC.test(href)

/**
 * next/link for the app. Links to public pages (from shared data and components) go straight to the website as
 * a plain link: no prefetch of a redirect, nothing for the CSP to block.
 */
export default function Link(props: ComponentProps<typeof NextLink>) {
  const { href } = props
  if (typeof href === 'string' && isPublicPath(href)) {
    const rest: Record<string, unknown> = { ...props }
    for (const k of [
      'href',
      'prefetch',
      'replace',
      'scroll',
      'shallow',
      'passHref',
      'legacyBehavior',
      'locale',
    ])
      delete rest[k]
    return <a href={webUrl(href)} {...(rest as ComponentProps<'a'>)} />
  }
  return <NextLink {...props} />
}
