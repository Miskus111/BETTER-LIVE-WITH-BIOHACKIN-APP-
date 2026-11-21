import { describe, expect, it } from 'vitest'
import { isPublicPath } from './Link'

describe('isPublicPath', () => {
  it('recognises website pages', () => {
    for (const p of [
      '/food/almonds',
      '/jak-funguje-telo/bilkoviny',
      '/doplnky#latky',
      '/terms',
      '/pricing?x=1',
    ])
      expect(isPublicPath(p), p).toBe(true)
  })
  it('leaves app pages alone', () => {
    for (const p of ['/today', '/eat/explore', '/login', '/foodie', '/settings'])
      expect(isPublicPath(p), p).toBe(false)
  })
})
