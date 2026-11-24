# Changelog

## 0.6.2 — Rychlejší zapisování jídla (24. 11. 2026)

- **Jídelníček:** „Často jíte“ — potraviny z posledního týdne, které k danému jídlu zapisujete nejčastěji, jedním
  klepnutím a ve stejném množství jako naposledy.
- **Smazání záznamu** jde 8 sekund vrátit („Vrátit“); když se smazání nepovede, aplikace to řekne (dřív tiše
  selhalo).
- **Doplňky:** odškrtnutí dávky a odebrání doplňku ohlásí chybu, když se nepovede (dřív tiše selhalo); „dnes“ se
  počítá podle českého času i v cizině.
- **Hledání potravin** snese české koncovky („jablka“, „knedlíky“), běžná slova („vajíčko“, „špagety“) a překlepy
  („jogrt“ → nabídne „jogurt“); když nic nenajde, řekne to.

## 0.6.1 — Spolehlivost a angličtina (23. 11. 2026)

- **Dnes:** tip dne bere v úvahu silnou nedávnou bolest (místo výzvy k tréninku).
- **Spolehlivé ukládání:** výpadek připojení při ukládání (bolest, doplňky, jídelníček, onboarding, laboratoř,
  check-in, váha) ukáže zprávu místo chybové stránky; varování mapy bolesti zůstane vždy vidět. Přívětivé chybové
  obrazovky.
- **Angličtina:** jídelníček ukazuje anglické názvy potravin a živin; úrovně důkazů v sekci Vzhled jsou přeložené.
- **Přihlášení** o čtvrtinu lehčí (Supabase se načte až při odeslání).
- **Testy databáze:** `npm run test:migrations` spustí všechny migrace na dočasném Postgresu a ověří zabezpečení,
  registraci, limity AI a izolaci uživatelů ve všech tabulkách, souborech a knihovnách.
- **Data:** nové potraviny a česká jídla z webu; týdenní kontrola, že sdílená data odpovídají webu
  (`check:data-sync`). Návod k nasazení `docs/nasazeni.md`.

## 0.6.0 — Samostatná aplikace a profil všude (22. 11. 2026)

- **Samostatný projekt:** aplikace má vlastní repozitář a nasazení; veřejné stránky (potraviny, průvodci, doplňky,
  právní stránky) vedou na web. Sdílená data převezme `npm run sync:data`.
- **Podle profilu:**
  - Dnes: „Čtení pro vás“ — tři průvodci podle bolestí, cílů (v pořadí priority) a sportu;
  - jídelníček: upozornění na alergie, stravu (vegan, vegetarián, pescetarián) a potraviny, které nejíte;
  - trénink: šablony pro váš sport první, pak ty, které zvládnete s vaším vybavením („půjde 4 z 6 cviků“);
  - mobilita: sestava pro sedavou práci a pro váš sport označené „pro vás“;
  - doplňky: B12 pro vegany a vegetariány, vitamín D v zimě, jód a omega-3 z řas bez mléka a ryb.
- **Přihlášení:** obnova a změna hesla, zobrazení hesla, opětovné poslání e-mailu, chyby v češtině.

## 0.5.0 — Phases 2–8 (branch `blwb-app`)

- **Train:** 179-exercise library with filters, 7 templates, offline-first workout logger (kg/lb, set types, RPE,
  supersets, rest timer with notification, plate calculator, e1RM), history and personal records, sport sessions.
- **Eat:** food diary with daily targets (Mifflin–St Jeor, BMR floor, ≤0.75 %/week loss), vitamins/minerals % NRV.
- **Supplements:** stack tracker with EFSA upper limits, medication interactions, excluded substances, daily check-off.
- **Mobility:** 37 exercises, 9 routines with a player, pain map with red-flag screening, pain trend chart.
- **Labs:** paste or upload results (PDF/photo read by Claude), review and confirm, 30-marker catalogue with unit
  conversion and flags, trends, InBody body composition.
- **Coach:** AI coach with safety pre-screen, read-only tools over your data, conversation history, daily limits.
- **Today:** real dashboard + daily sleep/recovery check-in. **Looks:** evidence-based daily habit tracker.
- **Plans & PWA:** FREE_MODE, plan section in Settings, installable app with offline fallback.
- Tests: 79 unit tests; Playwright e2e for the logger offline queue, red flags, stack safety, labs review, coach safety
  reply, looks, PWA; screenshots at 390/768/1440 including app screens.

## 0.4.0 — Phase 1: Better Live with Biohacking app foundation (branch `blwb-app`)

- Renamed FLX → **Better Live with Biohacking (BLWB)**; package `better-live-biohacking`.
- i18n (next-intl): Czech default, English switch; messages in `messages/cs.json` and `messages/en.json`.
- App shell: bottom tabs (Today · Train · Eat · Body · Coach) on mobile, sidebar with Labs, Mobility, Looks,
  Supplements, Where to buy and Settings on desktop. Body tab hosts the interactive anatomy.
- Supabase: SQL migration with all 35 tables, RLS on every table, private storage buckets, new-user trigger and
  server-side 18+ check; seed generator (USDA foods + affiliate catalogue); demo-user seed; RLS isolation test.
- Auth: email/password + Google OAuth, session middleware, protected app routes.
- Onboarding wizard (7 steps) with zod validation, 18+ confirmation and separate GDPR Art. 9 health-data consent.
- Settings: edit profile, language, data export (JSON), withdraw consent, full account deletion.
- Draft privacy policy (processors listed) and terms. Vitest unit tests for onboarding validation.

## 0.3.0 — 2026-11-16

### Informační web + affiliate místo obchodu

- Odstraněn obchod: produkty, košík, pokladna, commerce vrstva, produktové obrázky. Staré adresy se přesměrovávají.
- Nová stránka `/doplnky`: tabulka referenčních hodnot pro dospělé (RHP z etiket · doporučení EFSA PRI/AI pro muže a
  ženy · horní limit UL včetně aktualizací EFSA 2023–2024: B6 12,5 mg, železo bezpečná úroveň 40 mg) a u 16 živin
  formy seřazené podle vstřebatelnosti (D3 vs D2, bisglycinát vs oxid hořčíku, citrát/glukonát vs oxid zinku,
  železo obden…), kdy má doplněk smysl, tipy k užívání a studie (Tripkovic 2012, Stoffel 2017, Wegmüller 2014,
  Heaney 1999, NIH ODS, EFSA).
- Doporučené produkty (BrainMarket, Vilgain) vybrané podle formy a dávky, s affiliate parametry z env proměnných,
  `rel="sponsored"` a viditelným upozorněním; nová stránka `/jak-doporucujeme`.
- Záložka „Doplňky“ u orgánů, referenční hodnoty a nejlepší forma v přehledu živin, sekce Doplňky na úvodu.
- `check:data` kontroluje formy, reference a odkazy; testy pokrývají /doplnky a přesměrování.

## 0.2.0 — 2026-11-16

### Czech version, looksmaxing, where to buy, graphics

- Whole site translated to Czech (UI, organs, nutrients, foods, products, science pages); EU health-claim wording uses
  the official Czech text; prices in CZK (shipping 99 Kč, free from 1 200 Kč); Czech number formatting.
- New `/looksmaxing` page and homepage section: six evidence-graded levers (sun protection, sleep, muscle and protein
  incl. creatine, skin, hair and nails, posture), myths and risks (bone smashing, mewing, sunbeds/melanotan,
  steroids/SARMs, extreme cutting) and a mental-health note with Czech helplines.
- "Kde koupit" — example links to BrainMarket and Vilgain products/categories (`src/data/retailers.ts`), shown in the
  nutrient index, organ Products tab and looksmaxing page, with dose/safety notes; `npm run check:links` verifies them.
- Graphics: per-organ gradient shading, animated blood vessels, holographic floor ring and particles on the body;
  studio-lit food and product illustrations.
- Clarity: compact hero controls, "how it works" intro panel instead of a duplicate organ list, decluttered product
  cards, compact food list, tighter section spacing.
- `check:data` also rejects Czech banned claim words; Playwright builds into `.next-test` so it never breaks `npm run dev`.

## 0.1.0 — 2026-11-16

Ported the Vite prototype (`flx-source.zip`) to a Next.js App Router app and completed the brief.

### Phase 1 — Scaffold and data

- Next.js 15, TypeScript strict, Tailwind v4, ESLint + Prettier, Zustand, lucide, Instrument Serif / Geist / Geist Mono.
- Typed data modules for 11 organs, 25 nutrients, 32 foods (USDA FDC per 100 g) and 20 sample products.
- New certification model (`status`, `controlBody`, `verified`), `pasture`, `liveCultures`, `origin`, `processing`,
  `*`-marked organic ingredients, recipe blends for mixed products.
- All relationships computed in `lib/nutrition.ts`; "source of" thresholds from EU rules (15 % NRV, fibre 3 g,
  omega-3 40 mg / 0.3 g) with documented app rules for protein and lutein.
- `npm run check:data` validation and `npm run gen:placeholders` image generator.

### Phase 2 — Anatomy and organ panel

- SVG body with skin outline, skeleton, muscles and 8 internal organs; glow, scan line, beating heart, breathing lungs
  (all off under `prefers-reduced-motion`).
- Hover leader labels, click-to-zoom with animated viewBox, drag pan, double-click and ⌘/Ctrl-wheel zoom, ± buttons,
  Full body reset, prev/next, system filter, layer toggles, Tab/Enter keyboard access.
- Organ panel tabs: Overview, Nutrients (evidence badges, top sources with amounts and %), Foods, Products (add to
  cart), Science (research, "what research does NOT show", legend, sources). Intestines include the fermentation
  explainer (fermented food vs live cultures vs probiotic; heat-treated products contain no live cultures).
- Shareable `/organ/[id]` pages; `?organ=` deep links on the homepage; mobile bottom sheet.

### Phase 3 — Foods and nutrients

- Food explorer with 10 categories, macros, energy split, %NRV bars, live-culture and sodium notes, relevant organs
  (select on the body) and store products; `/food/[id]` pages.
- Nutrient index with reference values, source-of rules, EU-authorised claims (or an explicit "no claim"), organs and
  top sources; `/#nutrient-<id>` deep links. ⌘K / "/" search across organs, nutrients, foods and products.

### Phase 4 — Store, cart, checkout, content

- `/shop` with URL-synced category, EU BIO only and sorting; product cards with certification, control body, origin,
  processing, highlights and organ dots; `/product/[id]` with gallery, quantity, nutrition per 100 g, organs,
  ingredients and certification block; JSON-LD.
- Persisted cart with quantity controls, remove, clear, toasts, €4.90 shipping free from €49 with progress bar.
- Validated demo checkout through a `CommerceProvider` interface (mock → Stripe/Shopify later) with demo order number.
- `/science`, `/our-standard`, homepage sections, sitemap, robots, Open Graph image, 404, footer disclaimer and
  "Prototype · sample data" labels.

### Phase 5 — Polish and tests

- Playwright smoke tests (organ select/keyboard/prev-next/reset, system filter, search, cart persistence, EU BIO filter,
  checkout) and screenshot pass at 390 / 768 / 1440 px with a horizontal-overflow assertion.
- Fixed mobile overflow (grid and fieldset min-content sizing), padded organ zoom, kept the zoomed organ visible above
  the mobile sheet, moved placeholder labels clear of badges.

### Scientific corrections vs the prototype

- Food–organ links are computed, not hand-listed; nutrients an organ only absorbs/stores/activates no longer link foods.
- Stomach–zinc link downgraded from established to plausible; brain copy no longer uses "boosting".
- "Natural Live Yogurt" renamed "Plain Live Yogurt".
