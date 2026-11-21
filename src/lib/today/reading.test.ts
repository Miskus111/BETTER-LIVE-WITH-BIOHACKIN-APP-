import { describe, expect, it } from 'vitest'
import { BODY_GUIDE_BY_SLUG } from '@/data/body-guides'
import { READING_SLUGS, readingFor } from './reading'

const slugs = (...a: Parameters<typeof readingFor>) => readingFor(...a).map((g) => g.slug)

describe('readingFor', () => {
  it('every mapped guide exists on the website', () => {
    for (const s of READING_SLUGS) expect(BODY_GUIDE_BY_SLUG[s], s).toBeTruthy()
  })
  it('puts pain first, then goals in priority order, then sport', () => {
    expect(slugs({ painAreas: ['lower_back'], goals: ['fat_loss', 'muscle'], sports: ['running'] })).toEqual([
      'bolest-zad',
      'hubnuti-a-energie',
      'bilkoviny',
    ])
  })
  it('never repeats a guide and fills up for an empty profile', () => {
    expect(slugs({ painAreas: ['upper_back', 'lower_back'], goals: ['pain_relief'], sports: [] })).toEqual([
      'bolest-zad',
      'spanek',
      'stres',
    ])
    expect(slugs({ painAreas: ['none'], goals: [], sports: ['other'] })).toHaveLength(3)
  })
})
