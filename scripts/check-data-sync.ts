/**
 * Is the app's shared data (src/data) the same as the website's? The website is the source of truth; this
 * compares every data file the app has with the website repository's main branch on GitHub. Files only the app
 * has (exercises, mobility) are skipped. Fix drift with `npm run sync:data -- <website checkout>`.
 *
 *   npm run check:data-sync
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const RAW = 'https://raw.githubusercontent.com/Miskus111/BETTER-LIVE-WEB-/main/src/data/'

const walk = (dir: string): string[] =>
  readdirSync(join('src/data', dir), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  )

async function main() {
  let drift = 0
  let compared = 0
  for (const f of walk('')) {
    if (f.endsWith('.test.ts')) continue
    const res = await fetch(RAW + f)
    if (res.status === 404) continue // app-only file
    if (!res.ok) throw new Error(`${f}: HTTP ${res.status}`)
    compared++
    if ((await res.text()) !== readFileSync(join('src/data', f), 'utf8')) {
      console.log(`  ~ ${f} differs from the website`)
      drift++
    }
  }
  if (drift) {
    console.log(
      `✗ ${drift} of ${compared} shared data files differ — run npm run sync:data -- <website checkout>`,
    )
    process.exit(1)
  }
  console.log(`✓ ${compared} shared data files match the website`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
