import { IntlProvider } from '@/components/providers/IntlProvider'
import Link from '@/components/ui/Link'
import { Logo } from '@/components/layout/Logo'
import { LanguageSwitch } from '@/components/app/LanguageSwitch'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <IntlProvider>
      <div className="relative min-h-svh">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(58,168,255,0.12),transparent_70%)]"
        />
        <header className="relative flex items-center justify-between px-5 py-4">
          <Link href="/" aria-label="BLWB — Better Live with Biohacking">
            <Logo />
          </Link>
          <LanguageSwitch />
        </header>
        <main id="main" className="relative">
          {children}
        </main>
      </div>
    </IntlProvider>
  )
}
