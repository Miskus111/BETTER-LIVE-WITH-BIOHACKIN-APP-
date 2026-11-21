import Link from '@/components/ui/Link'
import { ArrowRight } from 'lucide-react'
import { COMPOUNDS, GOALS, type CompoundGoal } from '@/data/compounds'
import type { Evidence } from '@/data/types'
import { EvidenceBadge } from '@/components/ui/EvidenceBadge'

const RANK: Record<Evidence, number> = { established: 0, plausible: 1, preliminary: 2 }
const ORDER: CompoundGoal[] = ['vykon', 'soustredeni', 'spanek', 'stres', 'telo']

/** Overview of non-vitamin supplements, grouped by what people take them for. */
export function CompoundsSection({ headingLevel = 'h2' }: { headingLevel?: 'h2' | 'h3' }) {
  const H = headingLevel
  return (
    <section id="latky" aria-labelledby="latky-h" className="scroll-mt-24">
      <p className="eyebrow">Víc než vitamíny</p>
      <H id="latky-h" className="display mt-3 text-[36px] md:text-[48px]">
        Kreatin, kofein, L-theanin a spol.
      </H>
      <p className="text-muted mt-3 max-w-3xl text-[15.5px]">
        Doplňky, o kterých se mluví na sítích i v posilovně — s poctivým hodnocením, co z toho je prokázané,
        co pravděpodobné a co zatím jen slibné. U každého najdete dávku, načasování a hlavně bezpečnost.
      </p>
      <div className="mt-8 space-y-8">
        {ORDER.map((g) => {
          const items = COMPOUNDS.filter((c) => c.goal === g)
          if (!items.length) return null
          return (
            <div key={g}>
              <h3 className="text-[19px] font-medium">{GOALS[g].label}</h3>
              <p className="text-subtle text-[13.5px]">{GOALS[g].lead}</p>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((c) => {
                  const best = [...c.effects].sort((a, b) => RANK[a.level] - RANK[b.level])[0]
                  return (
                    <li key={c.id}>
                      <Link
                        href={`/doplnky/${c.slug}`}
                        className="card hover:border-cyan/40 flex h-full flex-col gap-2 p-4 transition"
                      >
                        <span className="flex items-start justify-between gap-2">
                          <span className="text-[16px] font-medium">{c.name}</span>
                          <EvidenceBadge level={best.level} />
                        </span>
                        <span className="text-muted text-[14px]">{c.verdict}</span>
                        <span className="text-cyan mt-auto inline-flex items-center gap-1 pt-1 text-[13.5px]">
                          Co opravdu umí <ArrowRight size={14} aria-hidden />
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>
    </section>
  )
}
