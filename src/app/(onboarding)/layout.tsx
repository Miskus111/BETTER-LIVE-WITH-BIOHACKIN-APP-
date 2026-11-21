import { IntlProvider } from '@/components/providers/IntlProvider'
import Link from '@/components/ui/Link'
import { Logo } from '@/components/layout/Logo'
import { LanguageSwitch } from '@/components/app/LanguageSwitch'

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <IntlProvider>
      <div className="min-h-svh">
        <header className="flex items-center justify-between px-5 py-4">
          <Link href="/" aria-label="BLWB — Better Live with Biohacking">
            <Logo />
          </Link>
          <LanguageSwitch />
        </header>
        <main id="main">{children}</main>
      </div>
    </IntlProvider>
  )
}
