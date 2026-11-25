import type { Evidence, NutrientId, OrganId, Source } from './types'
import { TOPIC_LINKS, WHERE_TO_BUY, type ShopLink } from './retailers'
import { SRC } from './sources'

/**
 * Looksmaxing podle důkazů: co na vzhled skutečně působí, a co je mýtus nebo riziko.
 * Stejná pravidla jako zbytek webu — žádné sliby, úroveň důkazů u každého bodu.
 */

export const LM_SRC = {
  sleep: {
    title: 'Axelsson a kol. (2010) Beauty sleep: experimental study, BMJ',
    url: 'https://pubmed.ncbi.nlm.nih.gov/21156746/',
  },
  sunscreen: {
    title: 'Hughes a kol. (2013) Sunscreen and prevention of skin aging, Annals of Internal Medicine',
    url: 'https://www.acpjournals.org/doi/10.7326/0003-4819-158-11-201306040-00002',
  },
  sunbeds: {
    title: 'WHO — Ultrafialové záření (přehled; solária zvyšují riziko rakoviny kůže)',
    url: 'https://www.who.int/news-room/fact-sheets/detail/ultraviolet-radiation',
  },
  creatine: {
    title: 'Kreider a kol. (2017) ISSN position stand: creatine supplementation, JISSN',
    url: 'https://jissn.biomedcentral.com/articles/10.1186/s12970-017-0173-z',
  },
} satisfies Record<string, Source>

export interface Pillar {
  id: string
  title: string
  lead: string
  level: Evidence
  facts: string[]
  howTo: string[]
  organs: OrganId[]
  nutrients?: NutrientId[]
  shop?: ShopLink[]
  sources: Source[]
}

export const PILLARS: Pillar[] = [
  {
    id: 'slunce',
    title: 'Ochrana před sluncem',
    lead: 'Největší páka na to, jak bude pleť vypadat za 10 let.',
    level: 'established',
    facts: [
      'UV záření je hlavní vnější příčinou viditelného stárnutí kůže — vrásek, pigmentových skvrn a ztráty pružnosti.',
      'V randomizované studii lidé, kteří denně používali krém s SPF, měli po 4,5 letech měřitelně méně známek stárnutí pleti.',
    ],
    howTo: [
      'Denně SPF 30+ na obličej, i v zimě a přes okno',
      'Klobouk a brýle při delším pobytu venku',
      'Žádné solárium',
    ],
    organs: ['skin'],
    sources: [LM_SRC.sunscreen, LM_SRC.sunbeds],
  },
  {
    id: 'spanek',
    title: 'Spánek',
    lead: 'Nevyspalý obličej poznají i cizí lidé.',
    level: 'plausible',
    facts: [
      'V experimentu lidé po zkrácení spánku působili na hodnotitele unaveněji a méně atraktivně než po normálním spánku.',
      'Spánek ovlivňuje i chuť k jídlu, regeneraci svalů a výkon v tréninku — tedy i složení těla.',
    ],
    howTo: ['7–9 hodin, ve stejný čas', 'Tma a chlad v ložnici', 'Kofein nejpozději 8 h před spaním'],
    organs: ['brain', 'skin'],
    sources: [LM_SRC.sleep],
  },
  {
    id: 'telo',
    title: 'Svaly a složení těla',
    lead: 'Silový trénink + dost bílkovin — nic jiného se tomu nevyrovná.',
    level: 'established',
    facts: [
      'Bílkoviny přispívají k růstu a udržení svalové hmoty (schválené tvrzení EU); hlavním motorem růstu je ale trénink.',
      'Kreatin zvyšuje fyzickou výkonnost při opakovaných krátkých výkonech vysoké intenzity (tvrzení EU, 3 g denně). Je to jeden z nejlépe prozkoumaných doplňků.',
    ],
    howTo: [
      'Silový trénink 2–4× týdně s postupným zvyšováním zátěže',
      'Bílkoviny v každém jídle (maso, ryby, vejce, mléčné výrobky, luštěniny)',
      'Kreatin monohydrát 3–5 g denně, pokud chcete',
    ],
    organs: ['muscles', 'bones'],
    nutrients: ['protein', 'vitD', 'magnesium'],
    shop: [...TOPIC_LINKS.creatine, ...(WHERE_TO_BUY.protein ?? []).slice(0, 2)],
    sources: [SRC.euRegister, LM_SRC.creatine],
  },
  {
    id: 'plet',
    title: 'Pleť zevnitř',
    lead: 'Živiny pleť udržují normální — „zářivou“ ji neudělají.',
    level: 'established',
    facts: [
      'Vitamín C přispívá k normální tvorbě kolagenu pro normální funkci kůže; zinek a vitamín A k udržení normálního stavu pokožky (tvrzení EU).',
      'Doplňky pomůžou hlavně při nedostatku. Kolagenové doplňky mají jen předběžné důkazy, studie často platí výrobci.',
    ],
    howTo: [
      'Ovoce a zelenina každý den (vitamín C)',
      'Ryby, maso, semínka, luštěniny (zinek)',
      'Mrkev, vejce, listová zelenina (vitamín A)',
    ],
    organs: ['skin'],
    nutrients: ['vitC', 'zinc', 'vitA'],
    shop: [
      ...(WHERE_TO_BUY.zinc ?? []).slice(0, 1),
      ...(WHERE_TO_BUY.vitC ?? []).slice(0, 1),
      ...TOPIC_LINKS.collagen.slice(0, 1),
    ],
    sources: [SRC.euRegister, SRC.ods],
  },
  {
    id: 'vlasy',
    title: 'Vlasy a nehty',
    lead: 'Výživa pomůže, když něco chybí. Genetiku nepřepíše.',
    level: 'plausible',
    facts: [
      'Zinek přispívá k udržení normálního stavu vlasů a nehtů (tvrzení EU). Nedostatek železa nebo bílkovin může vést k řídnutí vlasů.',
      'Nejčastější typ vypadávání vlasů (androgenní) je dědičný a hormonální — doplňky stravy ho nezastaví; řeší ho dermatolog.',
    ],
    howTo: [
      'Pestrá strava s dostatkem bílkovin',
      'Při vypadávání vlasů krevní testy (železo, štítná žláza) u lékaře',
      'Biotin jen při prokázaném nedostatku',
    ],
    organs: ['skin'],
    nutrients: ['zinc', 'iron', 'protein'],
    sources: [SRC.euRegister, SRC.ods],
  },
  {
    id: 'drzeni',
    title: 'Držení těla',
    lead: 'Rovná záda a otevřená ramena změní siluetu hned.',
    level: 'plausible',
    facts: [
      'Posílení zad, hýždí a středu těla pomáhá udržet vzpřímený postoj; dlouhé sezení v předklonu ho zhoršuje.',
      'Zatěžující pohyb je pro pevné kosti stejně důležitý jako vápník a vitamín D.',
    ],
    howTo: [
      'Přítahy, veslování, mrtvý tah s dobrou technikou',
      'Každou hodinu sezení se protáhnout',
      'Monitor ve výšce očí',
    ],
    organs: ['bones', 'muscles'],
    nutrients: ['calcium', 'vitD'],
    sources: [SRC.efsa],
  },
]

export interface Myth {
  /** krátký název pro náhledy */
  short: string
  myth: string
  fact: string
  danger?: boolean
}

export const MYTHS: Myth[] = [
  {
    short: 'Bone smashing',
    myth: '„Bone smashing“ — bušení do obličejových kostí zvýrazní čelist a lícní kosti.',
    fact: 'Opakované údery mohou způsobit zlomeniny, poškození nervů, zubů a trvalé deformity. Žádný přínos neexistuje. Nedělejte to.',
    danger: true,
  },
  {
    short: 'Mewing',
    myth: '„Mewing“ přetvaruje dospělou čelist.',
    fact: 'Neexistují kontrolované studie, že by poloha jazyka změnila tvar kostí u dospělých. Skutečné změny čelisti řeší ortodontista nebo čelistní chirurg.',
  },
  {
    short: 'Tvrdé žvýkačky',
    myth: 'Tvrdé žvýkačky vybudují ostrou čelist.',
    fact: 'Výraznější linii čelisti dělá hlavně méně tuku a genetika. Celodenní žvýkání může přetěžovat čelistní kloub a způsobit bolesti.',
  },
  {
    short: 'Anaboliky a SARMs',
    myth: 'Anaboliky, SARMs nebo peptidy jako zkratka.',
    fact: 'Jsou spojené s poškozením srdce, jater a hormonů, akné a neplodností; SARMs nejsou schválené jako léky a často obsahují něco jiného, než slibují.',
    danger: true,
  },
  {
    short: 'Solárium a melanotan',
    myth: 'Solárium nebo melanotan pro „zdravé“ opálení.',
    fact: 'Solária jsou karcinogen skupiny 1 (stejně jako tabák). Neregistrované opalovací injekce (melanotan) mohou měnit mateřská znaménka a nejsou bezpečné.',
    danger: true,
  },
  {
    short: 'Extrémní hubnutí',
    myth: 'Extrémní hubnutí na pár procent tuku pro „hunter eyes“.',
    fact: 'Velmi nízký podíl tuku dlouhodobě narušuje hormony, spánek i náladu. Udržitelná, zdravá postava vypadá lépe než vyčerpaná.',
  },
]
