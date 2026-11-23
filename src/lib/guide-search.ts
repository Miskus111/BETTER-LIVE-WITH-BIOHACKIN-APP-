import type { BodyGuide } from '@/data/body-guides'

/** Lowercase and strip diacritics so "spanek" finds "spánek". */
export const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/**
 * Rough Czech stems (text already without diacritics): the word without its ending vowels, and also without a
 * mobile "e" before the last consonant — "palacinka", "palacinky" → "palacink"; "rizek", "rizky" → "rizk";
 * "mleko", "mleka" → "mlek". Stems shorter than 4 letters are dropped (too vague to match on).
 */
export function stems(word: string): string[] {
  const w = word.replace(/[aeiouy]+$/, '')
  const out = /e[kc]$/.test(w) ? [w, w.slice(0, -2) + w.slice(-1)] : [w]
  return out.filter((x) => x.length >= 4)
}

/** All stems of the words in an already-normalised text. */
export const stemSet = (s: string) => new Set(s.split(/[^a-z0-9]+/).flatMap(stems))

/** Edit distance with adjacent swaps ("kofien" → "kofein" is 1), giving up above `max`. */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let prev2: number[] = []
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    let best = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1)
      cur.push(v)
      best = Math.min(best, v)
    }
    if (best > max) return max + 1
    prev2 = prev
    prev = cur
  }
  return prev[b.length]
}

/** Words of 4+ letters in the given texts: normalised form → how it is written (with diacritics). */
export function wordVocabulary(texts: string[]): Map<string, string> {
  const out = new Map<string, string>()
  for (const text of texts)
    for (const w of text.toLowerCase().split(/[^\p{L}\p{N}]+/u))
      if (w.length >= 4) {
        const n = norm(w)
        if (!out.has(n)) out.set(n, w)
      }
  return out
}

/**
 * Typo fix: every word of 4+ letters that `known` doesn't recognise is replaced by the closest vocabulary word
 * (1 edit, 2 for words of 7+ letters). Undefined when nothing needed or could be fixed.
 */
export function fixTypos(
  query: string,
  vocabulary: Map<string, string>,
  known: (word: string) => boolean,
): string | undefined {
  let changed = false
  const fixed = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const t = norm(word)
      if (t.length < 4 || known(t)) return word
      const max = t.length >= 7 ? 2 : 1
      let best: { d: number; w: string } | undefined
      for (const [n, written] of vocabulary) {
        const d = editDistance(t, n, max)
        if (d <= max && (!best || d < best.d)) best = { d, w: written }
      }
      if (!best) return word
      changed = true
      return best.w
    })
  return changed ? fixed.join(' ') : undefined
}

const cache = new WeakMap<BodyGuide, { title: string; lead: string; body: string }>()
/** normalised text of a guide, computed once (search runs on every keystroke) */
const fields = (g: BodyGuide) => {
  let f = cache.get(g)
  if (!f) cache.set(g, (f = build(g)))
  return f
}
const build = (g: BodyGuide) => ({
  title: norm(`${g.title} ${g.short}`),
  lead: norm(`${g.hook} ${g.tldr.join(' ')}`),
  body: norm(
    [
      ...g.how.map((h) => `${h.title} ${h.text}`),
      ...g.today,
      ...g.helps.map((h) => h.text),
      ...g.myths.map((m) => `${m.myth} ${m.fact}`),
    ].join(' '),
  ),
})

/**
 * Every word must appear somewhere in the guide; matches in the title rank highest, then the
 * hook and summary, then the body. An empty query returns the guides unchanged.
 */
export function searchGuides(guides: BodyGuide[], query: string): BodyGuide[] {
  const all = norm(query).split(/\s+/).filter(Boolean)
  // one-letter words ("vitamín d") match almost anything — ignore them unless they're all there is
  const words = all.some((w) => w.length > 1) ? all.filter((w) => w.length > 1) : all
  if (!words.length) return guides
  return guides
    .map((g, i) => {
      const f = fields(g)
      const all = `${f.title} ${f.lead} ${f.body}`
      if (!words.every((w) => all.includes(w))) return null
      const score = words.reduce((s, w) => s + (f.title.includes(w) ? 10 : f.lead.includes(w) ? 4 : 1), 0)
      return { g, score, i }
    })
    .filter((x): x is { g: BodyGuide; score: number; i: number } => !!x)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map((x) => x.g)
}
