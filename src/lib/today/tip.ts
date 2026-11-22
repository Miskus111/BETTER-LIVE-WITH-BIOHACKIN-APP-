export interface TipInput {
  outOfRange: number
  sleepMin: number | null
  /** hour in the user's day (0–23) */
  hour: number
  protein: number
  proteinTarget: number | null
  workouts: number
  trainingDays: number
  /** 0 = Sunday */
  weekday: number
  /** latest pain report */
  pain: { score: number; region: string; ageDays: number } | null
}

export type Tip =
  | { key: 'tipLabs'; n: number }
  | { key: 'tipPain'; score: number; region: string }
  | { key: 'tipSleep' }
  | { key: 'tipProtein'; left: number }
  | { key: 'tipTrain'; done: number; plan: number }
  | { key: 'tipDefault' }

/**
 * One practical nudge for today, most important first: lab values out of range, then strong recent pain (6/10
 * or more in the last 3 days — and then no push to train), short sleep, missing protein late in the day, behind
 * on planned workouts.
 */
export function todayTip(i: TipInput): Tip {
  if (i.outOfRange > 0) return { key: 'tipLabs', n: i.outOfRange }
  const strongPain = i.pain && i.pain.score >= 6 && i.pain.ageDays <= 3
  if (strongPain) return { key: 'tipPain', score: i.pain!.score, region: i.pain!.region }
  if (i.sleepMin !== null && i.sleepMin < 360) return { key: 'tipSleep' }
  if (i.proteinTarget && i.hour >= 15 && i.protein < i.proteinTarget * 0.5)
    return { key: 'tipProtein', left: Math.round(i.proteinTarget - i.protein) }
  if (i.workouts < i.trainingDays && i.weekday !== 0)
    return { key: 'tipTrain', done: i.workouts, plan: i.trainingDays }
  return { key: 'tipDefault' }
}
