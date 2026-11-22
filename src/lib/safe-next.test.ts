import { describe, expect, it } from 'vitest'
import { safeNext } from './safe-next'

describe('safeNext', () => {
  it('keeps in-app paths', () => {
    expect(safeNext('/coach?c=1')).toBe('/coach?c=1')
  })
  it('keeps the query of a deep link (food page → diary after login)', () => {
    expect(safeNext('/eat?add=almonds')).toBe('/eat?add=almonds')
    expect(safeNext(decodeURIComponent(encodeURIComponent('/eat?add=almonds')))).toBe('/eat?add=almonds')
  })
  it('rejects other hosts and tricks', () => {
    for (const bad of ['https://evil.com', '//evil.com', '/\\evil.com', 'coach', '', null, undefined])
      expect(safeNext(bad)).toBe('/today')
  })
})

describe('control characters', () => {
  it('rejects tab/newline tricks that browsers turn into //host', () => {
    expect(safeNext('/\t/evil.com')).toBe('/today')
    expect(safeNext('/\n/evil.com')).toBe('/today')
    expect(safeNext('/train?x=1')).toBe('/train?x=1')
  })
})
