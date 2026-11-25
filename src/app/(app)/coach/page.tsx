import { getTranslations } from 'next-intl/server'
import { requireAppUser } from '@/lib/auth'
import { isAiConfigured } from '@/lib/ai/client'
import { CoachChat, type ChatMessage, type Conversation } from '@/components/coach/CoachChat'

export async function generateMetadata() {
  const t = await getTranslations('nav')
  return { title: t('coach') }
}

type Db = { from: (t: string) => any } // eslint-disable-line @typescript-eslint/no-explicit-any

export default async function CoachPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { supabase } = await requireAppUser()
  const db = supabase as unknown as Db
  const t = await getTranslations('coach')
  const { c } = await searchParams
  // both queries at once (one round trip, not two); RLS limits each to the user's own rows, and the messages
  // only count when the conversation is in the user's list
  const wanted = c && /^[0-9a-f-]{36}$/i.test(c) ? c : null
  const [{ data: conversations }, { data: msgs }] = await Promise.all([
    db.from('coach_conversations').select('id, title').order('updated_at', { ascending: false }).limit(30),
    wanted
      ? db
          .from('coach_messages')
          .select('role, content')
          .eq('conversation_id', wanted)
          .in('role', ['user', 'assistant'])
          .order('created_at')
      : Promise.resolve({ data: [] }),
  ])
  const current = wanted && (conversations ?? []).some((x: Conversation) => x.id === wanted) ? wanted : null
  return (
    <div>
      <h1 className="display mb-6 text-[44px] md:text-[56px]">{t('title')}</h1>
      <CoachChat
        key={current ?? 'new'}
        conversations={(conversations ?? []) as Conversation[]}
        conversationId={current}
        initial={(current ? (msgs ?? []) : []) as ChatMessage[]}
        aiEnabled={isAiConfigured()}
      />
    </div>
  )
}
