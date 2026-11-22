import { safeNext } from '@/lib/safe-next'
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from './env'

/** Routes that require a signed-in user. */
export const APP_PATHS = [
  '/today',
  '/train',
  '/eat',
  '/body',
  '/coach',
  '/labs',
  '/mobility',
  '/looks',
  '/supplements',
  '/settings',
  '/onboarding',
]
export const isAppPath = (path: string) => APP_PATHS.some((p) => path === p || path.startsWith(`${p}/`))

/** Refreshes the auth session cookie and redirects anonymous users away from app routes. */
export async function updateSession(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.next({ request })

  let response = NextResponse.next({ request })
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  if (!user && isAppPath(path)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    // keep the query too (e.g. /eat?add=almonds from the website) so login returns to the same place
    url.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`
    return NextResponse.redirect(url)
  }
  if (user && path === '/login') {
    const next = request.nextUrl.searchParams.get('next')
    // keep the page the user asked for (relative in-app paths only)
    return NextResponse.redirect(new URL(safeNext(next), request.url))
  }
  return response
}
