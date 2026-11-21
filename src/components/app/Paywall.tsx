import Link from '@/components/ui/Link'
import { getTranslations } from 'next-intl/server'
import { Check, Lock } from 'lucide-react'
import { PRICES, type Feature } from '@/lib/billing'

/** Shown instead of a Pro feature when the user is on the free plan (only when FREE_MODE is off). */
export async function Paywall({ feature }: { feature: Feature }) {
  const t = await getTranslations('billing')
  const perks = ['perk_coach', 'perk_labs', 'perk_progress', 'perk_photos'] as const
  return (
    <section className="card border-cyan/25 mx-auto max-w-xl p-6 text-center md:p-8" data-testid="paywall">
      <span className="bg-cyan/10 text-cyan mx-auto grid h-12 w-12 place-items-center rounded-full">
        <Lock size={22} aria-hidden />
      </span>
      <p className="eyebrow mt-4">BLWB Pro</p>
      <h2 className="display mt-2 text-[34px]">{t(`lock_${feature}` as 'lock_photos')}</h2>
      <p className="text-muted mt-2 text-[15px]">{t('lockText')}</p>
      <ul className="mx-auto mt-5 grid max-w-sm gap-2 text-left text-[14.5px]">
        {perks.map((p) => (
          <li key={p} className="flex items-start gap-2">
            <Check size={17} className="text-bio mt-0.5 shrink-0" aria-hidden /> {t(p)}
          </li>
        ))}
      </ul>
      <p className="mt-6 font-mono text-[15px]">
        {t('priceLine', {
          month: new Intl.NumberFormat('cs-CZ').format(PRICES.pro_month_czk),
          year: new Intl.NumberFormat('cs-CZ').format(PRICES.pro_year_czk),
        })}
      </p>
      <Link href="/pricing" className="btn btn-primary mt-4">
        {t('seePlans')}
      </Link>
    </section>
  )
}
