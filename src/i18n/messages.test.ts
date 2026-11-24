import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import cs from '../../messages/cs.json'
import en from '../../messages/en.json'

type Tree = Record<string, unknown>
const flat = (o: unknown, p = ''): Record<string, unknown> =>
  o && typeof o === 'object'
    ? Object.entries(o as Tree).reduce((acc, [k, v]) => ({ ...acc, ...flat(v, p ? `${p}.${k}` : k) }), {})
    : { [p]: o }
const placeholders = (s: unknown) =>
  typeof s === 'string' ? [...s.matchAll(/\{(\w+)/g)].map((m) => m[1]).sort() : []

describe('translations', () => {
  const a = flat(cs)
  const b = flat(en)
  it('have the same keys in Czech and English', () => {
    expect(Object.keys(a).filter((k) => !(k in b))).toEqual([])
    expect(Object.keys(b).filter((k) => !(k in a))).toEqual([])
  })
  it('have no empty texts and the same {placeholders}', () => {
    expect(
      Object.entries({ ...a, ...b })
        .filter(([, v]) => v === '')
        .map(([k]) => k),
    ).toEqual([])
    expect(
      Object.keys(a).filter((k) => k in b && placeholders(a[k]).join() !== placeholders(b[k]).join()),
    ).toEqual([])
  })
})

const sources = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? sources(join(dir, e.name))
      : /\.tsx?$/.test(e.name) && !e.name.includes('.test.')
        ? [join(dir, e.name)]
        : [],
  )

describe('translation keys used in code', () => {
  it('exist in the messages (literal keys of every useTranslations / getTranslations translator)', () => {
    const known = flat(cs)
    const exists = (k: string) => k in known || Object.keys(known).some((x) => x.startsWith(`${k}.`))
    const missing: string[] = []
    let checked = 0
    for (const file of sources('src')) {
      const code = readFileSync(file, 'utf8')
      // const t = useTranslations('eat')  /  const w = await getTranslations('weight'); the same name can mean a
      // different namespace in another function of the file, so a call belongs to the nearest declaration above it
      const decls = [
        ...code.matchAll(/const (\w+) = (?:await )?(?:useTranslations|getTranslations)\('([\w.]+)'\)/g),
      ].map((m) => ({ name: m[1], ns: m[2], at: m.index }))
      for (const name of new Set(decls.map((d) => d.name))) {
        for (const call of code.matchAll(new RegExp(`\\b${name}\\(['"]([\\w.]+)['"]`, 'g'))) {
          const decl = decls.filter((d) => d.name === name && d.at < call.index).at(-1)
          if (!decl) continue
          checked++
          if (!exists(`${decl.ns}.${call[1]}`)) missing.push(`${file}: ${decl.ns}.${call[1]}`)
        }
      }
    }
    expect(checked).toBeGreaterThan(300)
    expect(missing).toEqual([])
  })
})
