export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

/**
 * false until the project is connected — the app then shows a setup screen instead of crashing. A hosted project
 * (https://<ref>.supabase.co) or a local one (`supabase start` on localhost / 127.0.0.1) counts.
 */
export const isSupabaseConfigured = () =>
  (/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(SUPABASE_URL) ||
    /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(SUPABASE_URL)) &&
  SUPABASE_ANON_KEY.length > 20
