import { IntlProvider } from '@/components/providers/IntlProvider'
import { MobileNav, Sidebar } from '@/components/app/AppNav'
import { SkipLink } from '@/components/app/SkipLink'

/**
 * Test-only preview of signed-in screens without Supabase auth. Enabled ONLY when the server runs
 * with ENABLE_PREVIEW=1 (Playwright sets it); otherwise every preview URL returns 404.
 */
export default function PreviewLayout({ children }: { children: React.ReactNode }) {
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
