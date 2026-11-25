import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const pages = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? pages(join(dir, e.name)) : e.name === 'page.tsx' ? [join(dir, e.name)] : [],
  )

describe('page titles', () => {
  it('every signed-in, auth and onboarding screen sets its own title (screen readers announce it)', () => {
    const missing = ['(app)', '(auth)', '(onboarding)']
      .flatMap((group) => pages(join('src/app', group)))
      .filter((f) => !/export (async function generateMetadata|const metadata)/.test(readFileSync(f, 'utf8')))
    expect(missing).toEqual([])
  })
})
