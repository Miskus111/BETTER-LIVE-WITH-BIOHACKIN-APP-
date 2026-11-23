/**
 * Average daily calories and protein over the 7 days before today. Today is left out (the day isn't over) and so
 * are days without entries (not logged ≠ ate nothing). Null when no day was logged.
 */
export function diaryWeek(
  rows: { logged_on: string; kcal: number | string; protein_g: number | string }[],
  today: string,
): { days: number; kcal: number; protein: number } | null {
  const t = Date.parse(today + 'T00:00:00Z')
  const byDay = new Map<string, { kcal: number; protein: number }>()
  for (const r of rows) {
    const age = Math.round((t - Date.parse(r.logged_on + 'T00:00:00Z')) / 864e5)
    if (age < 1 || age > 7) continue
    const d = byDay.get(r.logged_on) ?? { kcal: 0, protein: 0 }
    d.kcal += Number(r.kcal) || 0
    d.protein += Number(r.protein_g) || 0
    byDay.set(r.logged_on, d)
  }
  const days = [...byDay.values()]
  if (!days.length) return null
  return {
    days: days.length,
    kcal: Math.round(days.reduce((a, d) => a + d.kcal, 0) / days.length),
    protein: Math.round(days.reduce((a, d) => a + d.protein, 0) / days.length),
  }
}
