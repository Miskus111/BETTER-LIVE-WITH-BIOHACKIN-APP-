/**
 * Shared reference data (foods, supplements, exercises, organs…) is authored in the website repository
 * (BETTER-LIVE-WEB-), where the USDA pipeline and the physician review live. This copies every data file the
 * app already has from a local checkout of the website, so the two never drift apart silently.
 *
 *   npm run sync:data -- ../flx        (path to the website checkout)
 *
 * Review the diff, run the tests, commit.
 */
import { copyFileSync, existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const web = process.argv[2]
if (!web || !existsSync(join(web, 'src/data'))) {
  console.error('Usage: npm run sync:data -- <path to the website checkout>')
  process.exit(1)
}
let changed = 0
const walk = (dir: string): string[] =>
  readdirSync(join('src/data', dir), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  )
for (const f of walk('')) {
  const from = join(web, 'src/data', f)
  if (!existsSync(from)) {
    console.warn(`  ? ${f} — not in the website (app-only file, kept)`)
    continue
  }
  if (readFileSync(from, 'utf8') === readFileSync(join('src/data', f), 'utf8')) continue
  copyFileSync(from, join('src/data', f))
  console.log(`  ~ ${f}`)
  changed++
}
console.log(changed ? `✓ ${changed} data file(s) updated from ${web}` : '✓ data already in sync')
