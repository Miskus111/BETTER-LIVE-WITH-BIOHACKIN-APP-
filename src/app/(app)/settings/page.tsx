import Link from '@/components/ui/Link'
import { getTranslations } from 'next-intl/server'
import { Download, KeyRound, PencilLine, ShieldOff, Sparkles, Trash2 } from 'lucide-react'
import { isFreeMode, PRICES } from '@/lib/billing'
import { getPlan } from '@/lib/plan'
import { requireAppUser } from '@/lib/auth'
import { isAiConfigured } from '@/lib/ai/client'
import { LanguageSwitch } from '@/components/app/LanguageSwitch'
import { signOut } from '@/app/(auth)/actions'
import { deleteAccount, withdrawHealthConsent } from './actions'

export async function generateMetadata() {
  const t = await getTranslations('nav')
  return { title: t('settings') }
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ delete?: string }> }) {
  const { user, profile, supabase } = await requireAppUser()
  const plan = await getPlan(supabase, user.id)
  const free = isFreeMode()
  const t = await getTranslations('settings')
  const c = await getTranslations('common')
  const { delete: del } = await searchParams
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="display text-[44px]">{t('title')}</h1>

      <section className="card mt-6 p-5">
        <h2 className="eyebrow mb-3">{t('profile')}</h2>
        <p className="text-[16px]">{profile?.display_name}</p>
        <p className="text-muted text-[14px]">{user.email}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link href="/onboarding" className="btn btn-ghost !py-2">
            <PencilLine size={15} aria-hidden /> {t('editOnboarding')}
          </Link>
          <Link href="/reset-password" className="btn btn-ghost !py-2" data-testid="change-password">
            <KeyRound size={15} aria-hidden /> {t('changePassword')}
          </Link>
          <LanguageSwitch />
          <form action={signOut}>
            <button className="btn btn-ghost !py-2">{c('signOut')}</button>
          </form>
        </div>
      </section>

      <section className="card mt-4 p-5" data-testid="plan">
        <h2 className="eyebrow mb-3">{t('plan')}</h2>
        {free ? (
          <p className="flex gap-2 text-[15px]">
            <Sparkles size={17} className="text-cyan mt-0.5 shrink-0" aria-hidden /> {t('freeMode')}
          </p>
        ) : plan === 'pro' ? (
          <p className="text-[15px]">{t('planPro')}</p>
        ) : (
          <>
            <p className="text-[15px]">{t('planFree')}</p>
            <p className="text-muted mt-1 text-[14px]">
              {t('proPrice', {
                month: new Intl.NumberFormat('cs-CZ').format(PRICES.pro_month_czk),
                year: new Intl.NumberFormat('cs-CZ').format(PRICES.pro_year_czk),
              })}
            </p>
            <p className="text-subtle mt-3 text-[13px]">{t('paymentsSoon')}</p>
          </>
        )}
        {!isAiConfigured() && <p className="text-subtle mt-2 text-[13px]">{t('aiSoon')}</p>}
        <Link href="/pricing" className="link mt-3 inline-block text-[14px]">
          {t('seePricing')} →
        </Link>
      </section>

      <section className="card mt-4 p-5">
        <h2 className="eyebrow mb-3">{t('privacy')}</h2>
        <div className="flex flex-col gap-3">
          <a href="/api/me/export" className="btn btn-ghost justify-start !py-2" download>
            <Download size={15} aria-hidden /> {t('export')}
          </a>
          <form action={withdrawHealthConsent}>
            <button className="btn btn-ghost w-full justify-start !py-2 text-left !whitespace-normal">
              <ShieldOff size={15} className="shrink-0" aria-hidden /> {t('withdrawConsent')}
            </button>
          </form>
          <form action={deleteAccount} className="border-warn/25 rounded-xl border p-4">
            <p className="text-[14px]">{t('deleteConfirm')}</p>
            <label className="text-muted mt-3 block text-[13px]">
              {t.rich('typeToConfirm', {
                word: () => <code className="text-fg font-mono">{t('confirmWord')}</code>,
              })}
              <input name="confirm" className="field mt-1.5" autoComplete="off" />
            </label>
            {del === 'confirm' && <p className="mt-2 text-[13px] text-[#ff9b9b]">{t('confirmMismatch')}</p>}
            {del === 'error' && <p className="mt-2 text-[13px] text-[#ff9b9b]">{t('deleteError')}</p>}
            <button className="btn mt-3 border border-[#ff8b8b]/50 !py-2 text-[#ff9b9b] hover:bg-[#ff8b8b]/10">
              <Trash2 size={15} aria-hidden /> {t('delete')}
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}
