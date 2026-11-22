import { describe, expect, it } from 'vitest'
import { todayTip, type TipInput } from './tip'

const base: TipInput = {
  outOfRange: 0,
  sleepMin: 450,
  hour: 10,
  protein: 0,
  proteinTarget: 120,
  workouts: 0,
  trainingDays: 3,
  weekday: 3,
  pain: null,
}

describe('todayTip', () => {
  it('labs first, then strong recent pain instead of a push to train', () => {
    expect(todayTip({ ...base, outOfRange: 2 }).key).toBe('tipLabs')
    expect(todayTip({ ...base, pain: { score: 7, region: 'lower_back', ageDays: 1 } })).toEqual({
      key: 'tipPain',
      score: 7,
      region: 'lower_back',
    })
  })
  it('ignores mild or old pain', () => {
    expect(todayTip({ ...base, pain: { score: 4, region: 'neck', ageDays: 0 } }).key).toBe('tipTrain')
    expect(todayTip({ ...base, pain: { score: 8, region: 'neck', ageDays: 10 } }).key).toBe('tipTrain')
  })
  it('short sleep, then protein late in the day, then the default', () => {
    expect(todayTip({ ...base, sleepMin: 300 }).key).toBe('tipSleep')
    expect(todayTip({ ...base, hour: 16, protein: 30 })).toEqual({ key: 'tipProtein', left: 90 })
    expect(todayTip({ ...base, workouts: 3 }).key).toBe('tipDefault')
  })
})
