import type { Routine } from '@/data/mobility'

const FOR_SPORT: Record<string, string> = {
  running: 'runners',
  hiking: 'runners',
  gym: 'lifters',
  crossfit: 'lifters',
  martial_arts: 'fighters',
}
/** pain areas typical of sitting all day — the desk routine targets hips, thoracic spine and neck */
const DESK_PAIN = new Set(['neck', 'upper_back', 'lower_back', 'hip'])

/**
 * Mobility routines that suit this person, best first: desk work (or pain where sitting usually contributes)
 * brings up the desk routine, their sport brings up its routine. The rest keep their order. Returns the ids
 * picked for the person so the page can mark them.
 */
export function rankRoutines(
  routines: Routine[],
  { sports, workPattern, painAreas }: { sports: string[]; workPattern: string | null; painAreas: string[] },
): { routines: Routine[]; forYou: Set<string> } {
  const forYou = new Set<string>()
  if (workPattern === 'desk' || painAreas.some((p) => DESK_PAIN.has(p))) forYou.add('desk')
  for (const s of sports) if (FOR_SPORT[s]) forYou.add(FOR_SPORT[s])
  const known = new Set(routines.map((r) => r.id))
  for (const id of [...forYou]) if (!known.has(id)) forYou.delete(id)
  const order = [...forYou]
  return {
    routines: [...routines].sort((a, b) => {
      const ia = order.indexOf(a.id)
      const ib = order.indexOf(b.id)
      return (ia < 0 ? Infinity : ia) - (ib < 0 ? Infinity : ib) || routines.indexOf(a) - routines.indexOf(b)
    }),
    forYou,
  }
}
