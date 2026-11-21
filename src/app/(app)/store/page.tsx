import Link from '@/components/ui/Link'
import { getTranslations } from 'next-intl/server'
import { NUTRIENTS } from '@/data/nutrients'
import { TOPIC_LINKS, WHERE_TO_BUY } from '@/data/retailers'
import type { NutrientId } from '@/data/types'
import { WhereToBuy } from '@/components/ui/WhereToBuy'

const TOPIC_NAMES: Record<keyof typeof TOPIC_LINKS, string> = {
  creatine: 'Kreatin',
  collagen: 'Kolagen',
  fish: 'Ryby',
}

/** Affiliate catalogue grouped by nutrient — recommendations are neutral (see /jak-doporucujeme). */
export default async function StorePage() {
  const t = await getTranslations('nav')
  return (
    <div>
      <h1 className="display text-[44px] md:text-[56px]">{t('store')}</h1>
      <p className="text-muted mt-2 max-w-2xl text-[15px]">
        Doporučené produkty vybrané podle formy a dávky.{' '}
        <Link href="/jak-doporucujeme" className="link">
          Jak vybíráme
        </Link>
      </p>
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {(Object.keys(WHERE_TO_BUY) as NutrientId[]).map((id) => (
          <section key={id} className="card p-5">
            <h2 className="text-[17px] font-medium">{NUTRIENTS[id].name}</h2>
            <WhereToBuy links={WHERE_TO_BUY[id]} compact className="mt-3" />
          </section>
        ))}
        {(Object.keys(TOPIC_LINKS) as (keyof typeof TOPIC_LINKS)[]).map((k) => (
          <section key={k} className="card p-5">
            <h2 className="text-[17px] font-medium">{TOPIC_NAMES[k]}</h2>
            <WhereToBuy links={TOPIC_LINKS[k]} compact className="mt-3" />
          </section>
        ))}
      </div>
    </div>
  )
}
