import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google'
import { Providers } from '@/components/providers/Providers'
import { Analytics } from '@vercel/analytics/next'
import { SITE } from '@/lib/site'
import './globals.css'

const geist = Geist({ subsets: ['latin', 'latin-ext'], variable: '--font-geist' })
// mono is only used for small labels, never above-the-fold headings: don't let it compete with the LCP heading font
const geistMono = Geist_Mono({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-geist-mono',
  preload: false,
})
const serif = Instrument_Serif({
  subsets: ['latin', 'latin-ext'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-instrument-serif',
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  applicationName: SITE.name,
  title: { default: `${SITE.name} — ${SITE.tagline}`, template: `%s · ${SITE.short}` },
  description: SITE.description,
  openGraph: {
    type: 'website',
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    locale: 'cs_CZ',
  },
  twitter: { card: 'summary_large_image' },
}

export const viewport: Viewport = { themeColor: '#07090c', colorScheme: 'dark' }

// static: no cookies or headers here, so public pages are prerendered and served from the CDN
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="cs" className={`${geist.variable} ${geistMono.variable} ${serif.variable}`}>
      <body>
        <Providers>{children}</Providers>
        {/* cookieless page-view counts (no personal data, no consent banner needed) */}
        <Analytics />
      </body>
    </html>
  )
}
