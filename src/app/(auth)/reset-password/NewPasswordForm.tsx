'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { authErrorKey } from '@/lib/supabase/auth-errors'

/** The Supabase client (~66 KB) loads on the first submit, not with the page — the form appears faster on phones. */
const supabaseClient = () => import('@/lib/supabase/client').then((m) => m.createClient())

export function NewPasswordForm() {
  const t = useTranslations('auth')
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'saved' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) {
      setStatus('error')
      setMessage(t('passwordTooShort'))
      return
    }
    if (password !== confirm) {
      setStatus('error')
      setMessage(t('passwordMismatch'))
      return
    }
    setStatus('loading')
    const { error } = await (await supabaseClient()).auth.updateUser({ password })
    if (error) {
      setStatus('error')
      setMessage(t(authErrorKey(error) ?? 'resetError'))
      return
    }
    setStatus('saved')
    router.replace('/today')
    router.refresh()
  }

  return (
    <div className="mx-auto max-w-md px-5 pt-10 pb-16">
      <h1 className="display text-[46px]">{t('newPasswordTitle')}</h1>
      {status === 'saved' ? (
        <p className="mt-4 text-[16px]" role="status">
          {t('passwordSaved')}
        </p>
      ) : (
        <form onSubmit={submit} className="mt-6 grid gap-4" noValidate>
          <label className="grid gap-1.5">
            <span className="text-muted text-[14px]">{t('newPassword')}</span>
            <PasswordInput
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <span className="text-subtle text-[12.5px]">{t('passwordHint')}</span>
          </label>
          <label className="grid gap-1.5">
            <span className="text-muted text-[14px]">{t('confirmPassword')}</span>
            <PasswordInput
              autoComplete="new-password"
              minLength={8}
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>
          {status === 'error' && (
            <p role="alert" className="text-[14px] text-[#ff9b9b]">
              {message}
            </p>
          )}
          <button type="submit" className="btn btn-primary mt-2" disabled={status === 'loading'}>
            {status === 'loading' && <Loader2 size={16} className="animate-spin" aria-hidden />}
            {t('savePassword')}
          </button>
        </form>
      )}
    </div>
  )
}
