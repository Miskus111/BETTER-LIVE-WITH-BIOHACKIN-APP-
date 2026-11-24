/**
 * Dead-code guard: every module under src/ must be reachable from an entry point — a route or file Next loads by
 * name (src/app/**), the proxy, the i18n request config, or a script. Tests do not count, so code only a test uses
 * fails too. Follows static and dynamic imports (`@/…` and relative), including folders with an index file.
 *
 *   npm run check:unused
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { dirname, join, normalize } from 'node:path'

const walk = (dir: string): string[] =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory()
          ? walk(join(dir, e.name))
          : /\.tsx?$/.test(e.name) && !e.name.endsWith('.d.ts')
            ? [join(dir, e.name)]
            : [],
      )
    : []

const files = [...walk('src'), ...walk('scripts')]
const known = new Set(files)
const isTest = (f: string) => f.includes('.test.')

function resolve(spec: string, from: string): string | undefined {
  const base = spec.startsWith('@/')
    ? join('src', spec.slice(2))
    : spec.startsWith('.')
      ? normalize(join(dirname(from), spec))
      : undefined
  if (!base) return undefined
  return [`${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx'), base].find((c) =>
    known.has(c),
  )
}

const entries = files.filter(
  (f) =>
    !isTest(f) &&
    (f.startsWith(join('src', 'app')) ||
      f.startsWith('scripts') ||
      f === join('src', 'proxy.ts') ||
      f === join('src', 'i18n', 'request.ts')),
)
const seen = new Set(entries)
const stack = [...entries]
while (stack.length) {
  const f = stack.pop()!
  for (const m of readFileSync(f, 'utf8').matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)) {
    const r = resolve(m[1], f)
    if (r && !seen.has(r)) {
      seen.add(r)
      stack.push(r)
    }
  }
}

const unused = files.filter((f) => !seen.has(f) && !isTest(f))
if (unused.length) {
  console.log(`✗ ${unused.length} module(s) nothing uses (tests don't count) — delete them or use them:`)
  for (const f of unused) console.log(`  - ${f}`)
  process.exit(1)
}
console.log(`✓ all ${seen.size} modules are reachable from pages, the proxy or scripts`)
