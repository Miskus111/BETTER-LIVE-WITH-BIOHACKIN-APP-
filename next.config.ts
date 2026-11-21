import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const WEB_URL = (process.env.NEXT_PUBLIC_WEB_URL ?? 'https://better-live-web.vercel.app').replace(/\/$/, '')
const PUBLIC_PATHS = [
  '/food/:path*',
  '/organ/:path*',
  '/jak-funguje-telo/:path*',
  '/doplnky/:path*',
  '/looksmaxing',
  '/science',
  '/nastroje',
  '/privacy',
  '/terms',
  '/pricing',
  '/jak-doporucujeme',
  '/shop',
  '/our-standard',
]

/**
 * Where the site may load from and talk to: itself, Supabase (data, auth, photos) and Open Food Facts
 * (barcode lookup). Inline scripts stay allowed — Next's streamed payload is inline and a nonce would
 * turn every static page dynamic.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://world.openfoodfacts.org",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "form-action 'self'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ')

const nextConfig: NextConfig = {
  // the coach reads its system prompt from the repo root at runtime
  outputFileTracingIncludes: { '/api/coach': ['./system-prompt.md'] },
  // separate build folder for Playwright so tests don't clobber a running `npm run dev`
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Public pages live on the website (separate project). Links to them from shared data and components
  // (guides, foods, organs, legal pages) are sent there, so nothing has to be rewritten in the shared code.
  async redirects() {
    return PUBLIC_PATHS.map((source) => ({ source, destination: `${WEB_URL}${source}`, permanent: false }))
  },
  // metadata (title, description, og:image) always in <head> — every link-preview bot finds it
  htmlLimitedBots: /.*/,
  poweredByHeader: false,
  // Security headers that can't break the app. No script CSP on purpose: Next inline scripts,
  // Supabase, Vercel and Open Food Facts would need a nonce setup first.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // no framing by other sites (clickjacking on login and health forms)
          { key: 'X-Frame-Options', value: 'DENY' },
          // enforced after a clean report-only run on all page types (local and production)
          { key: 'Content-Security-Policy', value: CSP },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // the site never uses these; file pickers for photos are not affected
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
          },
        ],
      },
    ]
  },
}

export default withNextIntl(nextConfig)
