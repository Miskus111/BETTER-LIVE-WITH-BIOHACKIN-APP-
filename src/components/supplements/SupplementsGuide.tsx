import Link from '@/components/ui/Link'
import { AlertTriangle, Salad } from 'lucide-react'
import { NUTRIENTS } from '@/data/nutrients'
import { REF_SRC, REFERENCE } from '@/data/reference'
import { SUPPLEMENT_NUTRIENTS, supplementHref } from '@/data/supplements'
import { NutrientGuide } from './NutrientGuide'
import { CompoundsSection } from './CompoundsSection'

/** Shared by the public /doplnky page and the in-app Supplements module. */
export function SupplementsGuide({ inApp }: { inApp?: boolean }) {
  return (
    <div className={inApp ? '' : 'mx-auto max-w-[1200px] px-4 pt-12 md:px-8'}>
      <header className="max-w-3xl">
        <p className="eyebrow">Doplňky stravy</p>
        <h1 className="display mt-3 text-[48px] md:text-[68px]">Správná forma, správná dávka.</h1>
        <p className="text-muted mt-4 text-[16px]">
          Stejná živina se z různých forem vstřebává různě dobře — a „víc“ neznamená „lépe“. U každé živiny
          najdete, kdy má doplněk smysl, kterou formu tělo využije nejlépe, kolik doporučuje EFSA a kde je
          bezpečný horní limit.
        </p>
        <p className="border-bio/25 bg-bio/[0.05] mt-5 flex gap-2 rounded-xl border p-3.5 text-[14.5px]">
          <Salad size={17} className="text-bio mt-0.5 shrink-0" aria-hidden />
          <span>
            <strong className="font-medium">Nejdřív strava.</strong> Doplněk má smysl tam, kde strava nestačí
            — u většiny lidí v ČR typicky vitamín D v zimě, B12 u veganů, omega-3 u těch, kdo nejedí ryby, a
            železo jen při prokázaném nedostatku.
          </span>
        </p>
        <p className="mt-4 text-[15px]">
          Hledáte kreatin, kofein, L-theanin, melatonin nebo ashwagandhu?{' '}
          <a href="#latky" className="link">
            Látky nad rámec vitamínů ↓
          </a>
        </p>
      </header>

      <section aria-labelledby="tabulka" className="mt-14">
        <h2 id="tabulka" className="display text-[34px] md:text-[42px]">
          Referenční hodnoty pro dospělé
        </h2>
        <p className="text-muted mt-2 max-w-3xl text-[14.5px]">
          <strong className="text-fg font-medium">RHP</strong> je číslo z etiket („% RHP“).{' '}
          <strong className="text-fg font-medium">EFSA</strong> je skutečné doporučení — často vyšší a jiné
          pro muže a ženy. <strong className="text-fg font-medium">UL</strong> je horní limit ze všech zdrojů
          dohromady.
        </p>
        <div className="border-line mt-5 overflow-x-auto rounded-2xl border">
          <table className="w-full min-w-[720px] text-left text-[14px]">
            <caption className="sr-only">Referenční hodnoty: RHP, doporučení EFSA a horní limity</caption>
            <thead className="text-subtle bg-white/[0.03] font-mono text-[12px]">
              <tr>
                <th className="px-4 py-3 font-normal">Živina</th>
                <th className="px-4 py-3 font-normal">RHP (etiketa)</th>
                <th className="px-4 py-3 font-normal">Doporučení EFSA</th>
                <th className="px-4 py-3 font-normal">Horní limit (UL)</th>
              </tr>
            </thead>
            <tbody className="divide-line divide-y">
              {SUPPLEMENT_NUTRIENTS.map((id) => {
                const n = NUTRIENTS[id]
                const r = REFERENCE[id]
                return (
                  <tr key={id}>
                    <td className="px-4 py-2.5">
                      <Link href={supplementHref(id)} className="hover:text-cyan">
                        {n.name}
                      </Link>
                    </td>
                    <td className="text-muted px-4 py-2.5 font-mono text-[13px]">
                      {n.ref?.kind === 'RHP' ? `${n.ref.value.toLocaleString('cs-CZ')} ${n.unit}` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-[13.5px]">
                      {r?.efsa ? (
                        <>
                          {r.efsa.text}{' '}
                          <span className="text-subtle font-mono text-[12px]">{r.efsa.kind}</span>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-[13.5px]">{r?.ul?.text ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <ul className="mt-3 space-y-1">
          {Object.values(REF_SRC).map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noreferrer noopener" className="link text-[12.5px]">
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <nav aria-label="Živiny" className="mt-14 flex flex-wrap gap-2">
        {SUPPLEMENT_NUTRIENTS.map((id) => (
          <Link key={id} href={supplementHref(id)} className="chip">
            {NUTRIENTS[id].name}
          </Link>
        ))}
      </nav>

      <div className="mt-8 space-y-6">
        {SUPPLEMENT_NUTRIENTS.map((id) => (
          <NutrientGuide key={id} id={id} />
        ))}
      </div>

      <div className="mt-16">
        <CompoundsSection />
      </div>

      <aside className="border-warn/25 bg-warn/[0.04] mt-10 flex gap-3 rounded-2xl border p-5 text-[14px]">
        <AlertTriangle size={18} className="text-warn mt-0.5 shrink-0" aria-hidden />
        <p>
          Vzdělávací obsah, ne lékařská rada. Při užívání léků, v těhotenství, při kojení nebo chronickém
          onemocnění probírejte doplňky s lékařem nebo lékárníkem. Horní limity platí pro dospělé a pro součet
          ze stravy i doplňků.
        </p>
      </aside>
    </div>
  )
}
