# BLWB — aplikace

Osobní část Better Live with Biohacking: trénink pro jakýkoli sport, jídelníček, mobilita a bolest, regenerace,
doplňky, laboratorní výsledky, vzhled a AI kouč — pro každého podle jeho profilu a cílů.

Veřejný vzdělávací web (mapa těla, potraviny, průvodci, doplňky, právní stránky) je samostatný projekt
[BETTER-LIVE-WEB-](https://github.com/Miskus111/BETTER-LIVE-WEB-). Je statický a servíruje se z CDN; aplikace je
dynamická (přihlášení, Supabase) a běží ve Stockholmu vedle databáze.

> Vzdělávací obsah, ne lékařská rada.

```bash
npm install
npm run dev            # http://localhost:3000
```

| Skript                    | Co dělá                                                                          |
| ------------------------- | -------------------------------------------------------------------------------- |
| `npm run check`           | Vše, co spouští CI: lint, typecheck, unit testy a e2e                            |
| `npm run dev`             | Vývojový server                                                                  |
| `npm run build` / `start` | Produkční build                                                                  |
| `npm test`                | Vitest unit testy                                                                |
| `npm run test:e2e`        | Playwright: smoke testy + screenshoty 390/768/1440 (build do `.next-test`)       |
| `npm run sync:data`       | Převezme sdílená data (potraviny, doplňky, cviky, orgány) z checkoutu webu       |
| `npm run check:db`        | Produkční databáze má funkce z migrací a celou knihovnu cviků (čte `.env.local`) |
| `npm run test:rls`        | Test izolace RLS proti projektu Supabase                                         |
| `npm run seed:reference`  | Nahraje knihovny cviků, potravin a doplňků do Supabase (service key)             |
| `npm run seed:demo`       | Vytvoří / obnoví demo uživatele                                                  |
| `npm run gen:seed`        | Znovu vygeneruje `supabase/seed.sql` z `src/data`                                |

První běh Playwrightu: `npx playwright install chromium`.

## Web a aplikace

- **Odkazy na veřejné stránky** (`/food/*`, `/jak-funguje-telo/*`, `/doplnky/*`, `/organ/*`, `/privacy`, `/terms`,
  `/pricing`…) přesměrovává `next.config.ts` na web (`NEXT_PUBLIC_WEB_URL`). Sdílená data a komponenty proto
  odkazy přepisovat nemusí.
- **Sdílená data** (`src/data`) vznikají ve webu — tam je pipeline USDA, kontrola dat a podklad pro lékařskou
  kontrolu. Po změně dat ve webu spusťte `npm run sync:data -- ../BETTER-LIVE-WEB-`, projděte diff, testy, commit.
  Aplikace používá jen lehký index potravin (`foods.lite.generated.json`).
- `/` přesměruje na `/today` (nepřihlášené na přihlášení). Aplikace se neindexuje (`robots.txt`).

## Podle profilu

Odpovědi z onboardingu (cíle v pořadí priority, sport, vybavení, strava, alergie, bolesti, práce) mění obrazovky.
Logika je v čistých funkcích s testy, obrazovky ji jen zobrazují:

| Obrazovka  | Co se mění                                                                          | Kód                                        |
| ---------- | ----------------------------------------------------------------------------------- | ------------------------------------------ |
| Dnes       | tip dne (laboratoř, silná bolest, spánek, bílkoviny, trénink), „Čtení pro vás“      | `lib/today/tip.ts`, `lib/today/reading.ts` |
| Jídelníček | upozornění na alergie, stravu a nechtěné potraviny; `?add=<id>` otevře jídlo z webu | `lib/eat/conflicts.ts`                     |
| Trénink    | šablony pro váš sport první, „půjde n z m cviků“ s vaším vybavením                  | `lib/train/template-fit.ts`                |
| Mobilita   | sestava pro sedavou práci a pro váš sport                                           | `lib/pain/routine-fit.ts`                  |
| Doplňky    | B12, vitamín D v zimě, jód, omega-3 podle stravy                                    | `lib/supplements/suggestions.ts`           |
| AI kouč    | čte celý profil přes nástroj `get_profile`                                          | `lib/coach/tools.ts`                       |

Ukázky pro testy (`ENABLE_PREVIEW=1`): `/preview/today`, `/preview/eat?add=almonds`, `/preview/train`,
`/preview/mobility`, `/preview/supplements` — vždy s ukázkovým profilem popsaným v `preview/[screen]/page.tsx`.

## Supabase setup (EU)

1. Create a project at supabase.com in an **EU region** (this project uses North EU / Stockholm).
2. Copy `.env.example` to `.env.local` and fill `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and
   `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API).
3. Apply the schema: SQL Editor → paste `supabase/migrations/*.sql` in order → Run. Then run `supabase/seed.sql`
   (regenerate with `npm run gen:seed`).
4. Auth → URL Configuration: Site URL = your domain; add `http://localhost:3000/auth/callback` and
   `https://<domain>/auth/callback` to Redirect URLs. Sign-up confirmation, password reset
   (`/login?mode=reset` → e-mail → `/auth/callback` → `/reset-password`) and Google all return through it.
   Auth → Email Templates: translate "Confirm signup" and "Reset Password" into Czech. Auth → Settings: turn on
   leaked-password protection (the app shows a Czech message when Supabase rejects a weak password).
5. Google sign-in (optional): create an OAuth client in Google Cloud Console, enable the Google provider in
   Supabase → Auth → Providers with its client id/secret.
6. `npm run seed:reference` (exercises, foods, supplements, affiliate products — needs the service key).
7. `npm run seed:demo` (demo user from `DEMO_USER_EMAIL`/`DEMO_USER_PASSWORD`) and `npm run test:rls`
   (verifies one user can never read or change another user's data).

Without these variables the app routes show a setup screen.

## AI (coach + lab reading)

Set `ANTHROPIC_API_KEY` (server-only) and optionally `ANTHROPIC_MODEL` (default `claude-opus-5-5`). The coach's
rules live in [`system-prompt.md`](system-prompt.md); safety pre-screening is in `src/lib/coach/safety.ts`. Without a
key the app still works: the coach shows a notice and Labs accepts pasted text only.

## Tests

GitHub Actions (`.github/workflows/ci.yml`) spouští při každém pushi na `main` a u pull requestů lint, typecheck,
unit testy a celou e2e sadu. Při selhání se přiloží report Playwrightu.

`npm test` runs unit tests. `npm run test:e2e` builds into `.next-test` and starts it with `ENABLE_PREVIEW=1`, which
enables the test-only `/preview/<screen>` pages used to test signed-in screens without a login. Never set
`ENABLE_PREVIEW` in production.

## Bezpečnost

- Hlavičky v `next.config.ts`: nosniff, zákaz vkládání do rámců, referrer a permissions policy a CSP —
  web smí načítat a posílat data jen na vlastní doménu, `*.supabase.co` a Open Food Facts. Nová externí služba
  (platební brána, analytika, mapy) se musí do CSP přidat, jinak ji prohlížeč zablokuje. Inline skripty jsou
  povolené (Next je potřebuje; nonce by vypnul statické stránky).
- Supabase: po změně schématu spusťte poradce (Dashboard → Advisors). Migrace jsou v `supabase/migrations/`
  a spouštějí se ručně (SQL editor nebo `supabase db push`).
- E2E test spouští axe (přístupnost) na obrazovkách aplikace, přihlášení a obnově hesla.

## Před spuštěním

Podrobný postup krok za krokem: [docs/nasazeni.md](docs/nasazeni.md).

- Vercel: nový projekt z tohoto repozitáře, region se nastaví z `vercel.json` (Stockholm). Proměnné prostředí z
  `.env.example`, hlavně Supabase, `NEXT_PUBLIC_WEB_URL` (adresa webu) a `NEXT_PUBLIC_SITE_URL` (adresa aplikace).
- Supabase → Auth → URL Configuration: Site URL = adresa aplikace, Redirect URLs `https://<aplikace>/auth/callback`.
- Spustit migrace `20261119000000_ai_usage_atomic.sql` a `20261121000000_advisor_hardening.sql`; zapnout ochranu
  proti uniklým heslům.
