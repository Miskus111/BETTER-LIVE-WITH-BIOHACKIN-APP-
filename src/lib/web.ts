/**
 * The public educational website lives in its own project (BETTER-LIVE-WEB-). The app links to it for food
 * details, body guides, supplements and legal pages. Set NEXT_PUBLIC_WEB_URL on Vercel.
 */
export const WEB_URL = (process.env.NEXT_PUBLIC_WEB_URL ?? 'https://better-live-web.vercel.app').replace(
  /\/$/,
  '',
)

/** Absolute URL of a page on the public website. */
export const webUrl = (path: string) => `${WEB_URL}${path.startsWith('/') ? path : `/${path}`}`
