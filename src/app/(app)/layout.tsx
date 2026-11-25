import { IntlProvider } from '@/components/providers/IntlProvider'
import { isSupabaseConfigured } from '@/lib/supabase/env'
import { requireAppUser } from '@/lib/auth'
import { SetupNotice } from '@/components/app/SetupNotice'
import { MobileNav, Sidebar } from '@/components/app/AppNav'
import { SkipLink } from '@/components/app/SkipLink'

/** Signed-in app: sidebar on desktop, top bar + bottom tabs on mobile. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured()) return <SetupNotice />
  await requireAppUser()
  return (
    <IntlProvider>
      <SkipLink />
      <div className="lg:flex">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <MobileNav />
          <main id="main" className="mx-auto max-w-[1100px] px-4 pt-6 pb-28 md:px-8 lg:pt-10 lg:pb-16">
            {children}
          </main>
        </div>
      </div>
    </IntlProvider>
  )
}
