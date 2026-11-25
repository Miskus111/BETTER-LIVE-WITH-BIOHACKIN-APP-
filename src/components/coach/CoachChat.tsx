'use client'

import Link from '@/components/ui/Link'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Bot, MessageSquarePlus, ShieldAlert } from 'lucide-react'
import { Markdown } from './Markdown'
import { cx } from '@/lib/format'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  safety?: 'emergency' | 'crisis'
}
export interface Conversation {
  id: string
  title: string | null
}

/** Health situations the user ticked in the supplement tracker (device-only, see StackTracker). */
function savedConditions(): string[] {
  try {
    return JSON.parse(localStorage.getItem('blwb-supp-conditions') ?? '[]') as string[]
  } catch {
    return []
  }
}

export function CoachChat({
  conversations,
  conversationId: initialId,
  initial,
  aiEnabled,
  endpoint = '/api/coach',
}: {
  conversations: Conversation[]
  conversationId: string | null
  initial: ChatMessage[]
  aiEnabled: boolean
  endpoint?: string
}) {
  const t = useTranslations('coach')
  const locale = useLocale()
  const [messages, setMessages] = useState<ChatMessage[]>(initial)
  const [conversationId, setConversationId] = useState(initialId)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => endRef.current?.scrollIntoView({ block: 'end' }), [messages, busy])

  const send = async (text: string) => {
    const message = text.trim()
    if (!message || busy) return
    setDraft('')
    setError(null)
    setMessages((m) => [...m, { role: 'user', content: message }])
    setBusy(true)
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ conversationId, message, locale, conditions: savedConditions() }),
      })
      const j = await res.json()
      if (!res.ok) {
        setError(t(`err_${j.error ?? 'generic'}` as 'err_generic', { limit: j.limit ?? '' }))
        return
      }
      setConversationId(j.conversationId)
      if (!initialId && j.conversationId) window.history.replaceState(null, '', `?c=${j.conversationId}`)
      setMessages((m) => [...m, { role: 'assistant', content: j.reply, safety: j.safety }])
    } catch {
      setError(t('err_generic'))
    } finally {
      setBusy(false)
    }
  }

  const prompts = [t('p1'), t('p2'), t('p3'), t('p4')]

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <aside className="hidden lg:block" aria-label={t('history')}>
        <Link href="/coach" className="btn btn-ghost w-full !justify-start !py-2 !text-[14px]">
          <MessageSquarePlus size={15} aria-hidden /> {t('new')}
        </Link>
        <ul className="mt-3 space-y-1">
          {conversations.map((c) => (
            <li key={c.id}>
              <Link
                href={`/coach?c=${c.id}`}
                className={cx(
                  'block truncate rounded-lg px-3 py-1.5 text-[14px]',
                  c.id === conversationId ? 'bg-white/[0.06] text-white' : 'text-muted hover:text-white',
                )}
              >
                {c.title || t('untitled')}
              </Link>
            </li>
          ))}
        </ul>
      </aside>

      <section className="flex min-h-[60vh] flex-col" aria-label={t('chat')}>
        {!aiEnabled && <p className="text-warn mb-4 text-[14px]">{t('aiOff')}</p>}
        <ol className="flex-1 space-y-4" aria-live="polite" data-testid="coach-messages">
          {messages.length === 0 && (
            <li className="card p-5">
              <Bot className="text-cyan" size={22} aria-hidden />
              <p className="mt-2 text-[15px]">{t('hello')}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {prompts.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className="btn btn-ghost !py-1.5 text-left !text-[13.5px] !whitespace-normal"
                    onClick={() => send(p)}
                    disabled={busy}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </li>
          )}
          {messages.map((m, i) => (
            <li
              key={i}
              className={cx(
                'max-w-[46rem] rounded-2xl px-4 py-3 text-[15px] leading-relaxed',
                m.role === 'user' ? 'bg-cyan/10 ml-auto' : 'card',
                m.safety && 'border-[#ff6b6b]/50',
              )}
              data-testid={`msg-${m.role}`}
            >
              {m.safety && <ShieldAlert size={18} className="mb-1 text-[#ff9b9b]" aria-hidden />}
              {m.role === 'assistant' ? <Markdown text={m.content} /> : m.content}
            </li>
          ))}
          {busy && (
            <li className="text-muted text-[14px]" role="status">
              {t('thinking')}
            </li>
          )}
        </ol>
        {error && (
          <p className="mt-3 text-[14px] text-[#ff9b9b]" role="alert">
            {error}
          </p>
        )}
        <form
          className="border-line focus-within:border-cyan sticky bottom-20 mt-4 flex items-end gap-2 rounded-2xl border bg-[#0b0e12] p-2 transition-colors lg:bottom-4"
          onSubmit={(e) => {
            e.preventDefault()
            void send(draft)
          }}
        >
          <textarea
            aria-label={t('placeholder')}
            placeholder={t('placeholder')}
            value={draft}
            maxLength={4000}
            rows={1}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void send(draft)
              }
            }}
            className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-[15px] outline-none"
            data-testid="coach-input"
          />
          <button
            type="submit"
            aria-label={t('send')}
            disabled={busy || !draft.trim()}
            className="bg-cyan text-ink grid h-10 w-10 place-items-center rounded-xl disabled:opacity-40"
          >
            <ArrowUp size={18} />
          </button>
        </form>
        <p className="text-subtle mt-2 text-[12.5px]">{t('disclaimer')}</p>
      </section>
    </div>
  )
}
