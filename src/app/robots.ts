import type { MetadataRoute } from 'next'

/** The app is private: nothing here should be indexed (the public content lives on the website). */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', disallow: '/' } }
}
