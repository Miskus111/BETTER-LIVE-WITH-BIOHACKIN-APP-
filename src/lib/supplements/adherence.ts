/** Calendar date (YYYY-MM-DD) in Prague — a dose at 00:30 belongs to that day, not the previous UTC one. */
export const pragueDate = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Prague',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)

/**
 * For each supplement in the stack: was it taken on each of the last 7 days (oldest first, today last)?
 */
export function lastSevenDays(
  logs: { user_supplement_id: string; taken_at: string }[],
  ids: string[],
  now: Date,
): Record<string, boolean[]> {
  const days = Array.from({ length: 7 }, (_, i) => pragueDate(new Date(now.getTime() - (6 - i) * 864e5)))
  const taken = new Set(logs.map((l) => `${l.user_supplement_id}|${pragueDate(new Date(l.taken_at))}`))
  return Object.fromEntries(ids.map((id) => [id, days.map((d) => taken.has(`${id}|${d}`))]))
}
