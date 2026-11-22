import { describe, expect, it } from 'vitest'
import { ROUTINES } from '@/data/mobility'
import { rankRoutines } from './routine-fit'

const ids = (p: Parameters<typeof rankRoutines>[1]) => rankRoutines(ROUTINES, p).routines.map((r) => r.id)

describe('rankRoutines', () => {
  it('desk work and a runner: desk routine, then the runners one', () => {
    expect(ids({ sports: ['running'], workPattern: 'desk', painAreas: [] }).slice(0, 2)).toEqual([
      'desk',
      'runners',
    ])
  })
  it('lower back pain brings up the desk routine even without desk work', () => {
    const r = rankRoutines(ROUTINES, { sports: [], workPattern: 'physical', painAreas: ['lower_back'] })
    expect(r.routines[0].id).toBe('desk')
    expect([...r.forYou]).toEqual(['desk'])
  })
  it('an empty profile keeps the authored order and marks nothing', () => {
    const r = rankRoutines(ROUTINES, { sports: [], workPattern: null, painAreas: [] })
    expect(r.routines.map((x) => x.id)).toEqual(ROUTINES.map((x) => x.id))
    expect(r.forYou.size).toBe(0)
  })
})
