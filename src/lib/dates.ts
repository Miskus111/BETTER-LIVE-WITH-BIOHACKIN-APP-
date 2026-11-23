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

/** Prague's offset from UTC in minutes at an instant (+60 in winter, +120 in summer). */
const pragueOffsetMin = (d: Date) => {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Prague', timeZoneName: 'shortOffset' })
    .formatToParts(d)
    .find((p) => p.type === 'timeZoneName')?.value // "GMT+1" / "GMT+2"
  const m = name?.match(/GMT([+-]\d+)(?::(\d+))?/)
  return m ? Number(m[1]) * 60 + Math.sign(Number(m[1])) * Number(m[2] ?? 0) : 0
}

/** The instant of midnight in Prague that starts the given Prague calendar day. */
export const pragueMidnight = (day: string) => {
  const utcMidnight = Date.parse(`${day}T00:00:00Z`)
  // the offset can differ between UTC midnight and Prague midnight only on DST days; checking twice settles it
  const first = utcMidnight - pragueOffsetMin(new Date(utcMidnight)) * 60000
  return new Date(utcMidnight - pragueOffsetMin(new Date(first)) * 60000)
}

/** Monday (YYYY-MM-DD) of the Prague week that contains the given Prague day. */
export const pragueMonday = (day: string) => {
  const dow = new Date(`${day}T12:00:00Z`).getUTCDay() // 0 = Sunday
  return dayBefore(day, (dow + 6) % 7)
}
