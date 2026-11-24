import Link from '@/components/ui/Link'
import { getLocale, getTranslations } from 'next-intl/server'
import { PANEL_BY_KEY } from '@/lib/foods/panel'
import { NUTRIENTS } from '@/data/nutrients'
import { TOPIC_LINKS, WHERE_TO_BUY } from '@/data/retailers'
import type { NutrientId } from '@/data/types'
import { WhereToBuy } from '@/components/ui/WhereToBuy'

/** English names of nutrients that have no row in the nutrition panel (qualitative ones). */
const EN_ONLY_HERE: Partial<Record<NutrientId, string>> = { cultures: 'Live cultures' }

/** Affiliate catalogue grouped by nutrient — recommendations are neutral (see /jak-doporucujeme). */
export default async function StorePage() {
  const t = await getTranslations('nav')
  const shop = await getTranslations('shop')
  const en = (await getLocale()) === 'en'
  const nutrientName = (id: NutrientId) =>
    en
      ? ((PANEL_BY_KEY as Record<string, { en: string }>)[id]?.en ?? EN_ONLY_HERE[id] ?? NUTRIENTS[id].name)
      : NUTRIENTS[id].name
  return (
    <div>
      <h1 className="display text-[44px] md:text-[56px]">{t('store')}</h1>
      <p className="text-muted mt-2 max-w-2xl text-[15px]">
        {shop('intro')} {en && `${shop('czechShops')} `}
        <Link href="/jak-doporucujeme" className="link">
          {shop('how')}
        </Link>
      </p>
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {(Object.keys(WHERE_TO_BUY) as NutrientId[]).map((id) => (
          <section key={id} className="card p-5">
            <h2 className="text-[17px] font-medium">{nutrientName(id)}</h2>
            <WhereToBuy links={WHERE_TO_BUY[id]} compact className="mt-3" />
          </section>
        ))}
        {(Object.keys(TOPIC_LINKS) as (keyof typeof TOPIC_LINKS)[]).map((k) => (
          <section key={k} className="card p-5">
            <h2 className="text-[17px] font-medium">{shop(`topic_${k}`)}</h2>
            <WhereToBuy links={TOPIC_LINKS[k]} compact className="mt-3" />
          </section>
        ))}
      </div>
    </div>
  )
}
