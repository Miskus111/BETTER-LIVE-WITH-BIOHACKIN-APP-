'use client'

import Link from '@/components/ui/Link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { Loader2, MailCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { authErrorKey } from '@/lib/supabase/auth-errors'

export function LoginForm({
  next,
  initialMode,
  linkExpired = false,
}: {
  next: string
  initialMode: 'signin' | 'signup' | 'reset'
  linkExpired?: boolean
}) {
  const t = useTranslations('auth')
  const router = useRouter()
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState('')
  // seconds until the confirmation / reset e-mail may be sent again (Supabase limits e-mails per hour)
  const [cooldown, setCooldown] = useState(0)
  const [resent, setResent] = useState(false)

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(id)
  }, [cooldown])

  const showGoogle = process.env.NEXT_PUBLIC_GOOGLE_AUTH === '1' && mode !== 'reset'

  const callback = (target: string) =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(target)}`

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    // a message from an earlier failed attempt must not show up on the next screen
    setMessage('')
    setResent(false)
    const supabase = createClient()
    if (mode === 'reset') {
      // same answer whether or not the account exists (no account enumeration)
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: callback('/reset-password'),
      })
      // a rate limit or bad address says nothing about whether the account exists
      const key = authErrorKey(error)
      if (key === 'errRateLimit' || key === 'errEmailInvalid') {
        setStatus('error')
        setMessage(t(key))
        return
      }
      setStatus('sent')
      setCooldown(60)
      return
    }
    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setStatus('error')
        setMessage(authErrorKey(error) === 'errRateLimit' ? t('errRateLimit') : t('error'))
        return
      }
      router.replace(next)
      router.refresh()
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: callback('/onboarding') },
      })
      if (error) {
        setStatus('error')
        setMessage(t(authErrorKey(error) ?? 'errGeneric'))
        return
      }
      if (data.session) {
        router.replace('/onboarding')
        router.refresh()
      } else {
        setStatus('sent')
        setCooldown(60)
      }
    }
  }

  const resend = async () => {
    const supabase = createClient()
    const { error } =
      mode === 'reset'
        ? await supabase.auth.resetPasswordForEmail(email, { redirectTo: callback('/reset-password') })
        : await supabase.auth.resend({
            type: 'signup',
            email,
            options: { emailRedirectTo: callback('/onboarding') },
          })
    setCooldown(60)
    setResent(!error || authErrorKey(error) !== 'errRateLimit')
    if (authErrorKey(error) === 'errRateLimit') setMessage(t('errRateLimit'))
  }

  const google = async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: callback(next) } })
  }

  if (status === 'sent')
    return (
      <div className="mx-auto max-w-md px-5 pt-16 text-center">
        <MailCheck size={36} className="text-cyan mx-auto" aria-hidden />
        <p className="mt-4 text-[17px]" role="status">
          {mode === 'reset' ? t('resetSent') : t('checkEmail')}
        </p>
        <p className="text-muted mt-6 text-[14px]">{t('noEmail')}</p>
        <button
          type="button"
          onClick={resend}
          disabled={cooldown > 0}
          className="btn btn-ghost mt-3 !py-2"
          data-testid="resend"
        >
          {cooldown > 0 ? t('resendWait', { s: cooldown }) : t('resend')}
        </button>
        <p className="mt-2 min-h-5 text-[13px]" aria-live="polite">
          {resent ? t('resent') : message}
        </p>
      </div>
    )

  return (
    <div className="mx-auto max-w-md px-5 pt-10 pb-16">
      <h1 className="display text-[46px]">
        {mode === 'signin' ? t('title') : mode === 'signup' ? t('signupTitle') : t('resetTitle')}
      </h1>
      <p className="text-muted mt-2 text-[15px]">{mode === 'reset' ? t('resetSubtitle') : t('subtitle')}</p>
      {linkExpired && mode === 'signin' && (
        <p className="border-line mt-5 rounded-lg border px-4 py-3 text-[14.5px]" data-testid="link-expired">
          {t('callbackError')}
        </p>
      )}

      {showGoogle && (
        <>
          <button
            type="button"
            onClick={google}
            className="btn btn-ghost mt-8 w-full"
            data-testid="google-signin"
          >
            <GoogleMark /> {t('google')}
          </button>
          <div className="text-subtle my-6 flex items-center gap-3 font-mono text-[12px] uppercase">
            <span className="bg-line h-px flex-1" />
            {t('or')}
            <span className="bg-line h-px flex-1" />
          </div>
        </>
      )}

      {/* the Google block above brings its own spacing */}
      <form onSubmit={submit} className={`grid gap-4 ${showGoogle ? '' : 'mt-8'}`} noValidate>
        <label className="grid gap-1.5">
          <span className="text-muted text-[14px]">{t('email')}</span>
          <input
            className="field"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        {mode !== 'reset' && (
          <label className="grid gap-1.5">
            <span className="text-muted text-[14px]">{t('password')}</span>
            <PasswordInput
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {mode === 'signup' && <span className="text-subtle text-[12.5px]">{t('passwordHint')}</span>}
          </label>
        )}
        {status === 'error' && (
          <p role="alert" className="text-[14px] text-[#ff9b9b]">
            {message}
          </p>
        )}
        <button type="submit" className="btn btn-primary mt-2" disabled={status === 'loading'}>
          {status === 'loading' && <Loader2 size={16} className="animate-spin" aria-hidden />}
          {mode === 'signin' ? t('signIn') : mode === 'signup' ? t('signUp') : t('sendReset')}
        </button>
      </form>

      {mode === 'signin' && (
        <button
          type="button"
          onClick={() => {
            setMode('reset')
            setStatus('idle')
          }}
          className="link mt-4 block text-[14px]"
          data-testid="forgot-password"
        >
          {t('forgot')}
        </button>
      )}

      <button
        type="button"
        onClick={() => {
          setMode(mode === 'signin' ? 'signup' : 'signin')
          setStatus('idle')
        }}
        className="link mt-5 text-[14.5px]"
      >
        {mode === 'signin' ? t('noAccount') : mode === 'signup' ? t('haveAccount') : t('backToLogin')}
      </button>

      <p className="text-subtle mt-8 text-[13px]">{t('adultsOnly')}</p>
      <p className="text-subtle mt-1 text-[13px]">
        {t.rich('legal', {
          terms: (c) => (
            <Link href="/terms" className="underline underline-offset-2">
              {c}
            </Link>
          ),
          privacy: (c) => (
            <Link href="/privacy" className="underline underline-offset-2">
              {c}
            </Link>
          ),
        })}
      </p>
    </div>
  )
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  )
}
