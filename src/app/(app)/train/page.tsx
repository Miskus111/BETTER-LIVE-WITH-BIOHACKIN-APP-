import { TrainHome } from '@/components/train/TrainHome'
import { requireAppUser } from '@/lib/auth'
import { TEMPLATES } from '@/data/exercises/templates'
import { rankTemplates } from '@/lib/train/template-fit'

type Db = { from: (t: string) => any } // eslint-disable-line @typescript-eslint/no-explicit-any

export default async function TrainPage({ searchParams }: { searchParams: Promise<{ finished?: string }> }) {
  const { finished } = await searchParams
  const { supabase, user } = await requireAppUser()
  const { data: prefs } = await (supabase as unknown as Db)
    .from('preferences')
    .select('equipment, sports')
    .eq('user_id', user.id)
    .maybeSingle()
  const fit = rankTemplates(TEMPLATES, { equipment: prefs?.equipment ?? [], sports: prefs?.sports ?? [] })
  return <TrainHome finished={finished === '1'} fit={fit} />
}
