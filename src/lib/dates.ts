/** ISO timestamp `days` days before now (server components, once per request). */
export const isoDaysAgo = (days: number) => new Date(Date.now() - days * 864e5).toISOString()
/** YYYY-MM-DD `days` days before today (UTC). */
export const dayDaysAgo = (days: number) => isoDaysAgo(days).slice(0, 10)

/** Calendar day (YYYY-MM-DD) in Prague. Servers run on UTC: between midnight and 1–2 a.m. Czech time UTC is still yesterday. */
export const pragueDay = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Prague',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)

/** The Prague calendar day `days` before `day` (plain date arithmetic, no time zone involved). */
export const dayBefore = (day: string, days: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) - days * 864e5).toISOString().slice(0, 10)

/** The device's local calendar day (YYYY-MM-DD) for browser code — UTC would move entries made after midnight to yesterday. */
export const localDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
