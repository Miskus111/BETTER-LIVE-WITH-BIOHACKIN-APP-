# Decisions — Better Live with Biohacking (BLWB)

Short, dated records of choices made while building. Newest first within each phase.


## 2026-11-21 — Web a aplikace jako dva projekty

- **Rozhodnutí:** veřejný vzdělávací web zůstává v `BETTER-LIVE-WEB-`, aplikace (přihlášení, osobní data, AI kouč)
  je v `BETTER-LIVE-WITH-BIOHACKIN-APP-`, každý s vlastním nasazením na Vercelu.
- **Proč:** web byl pomalý, protože každá stránka se renderovala zvlášť v USA (jazyková cookie v kořenovém layoutu,
  proxy se Supabase na každém požadavku, region iad1). Web bez aplikace je čistě statický a jde z CDN; aplikace běží
  ve Stockholmu vedle databáze. Změna webu nenasazuje aplikaci a naopak.
- **Sdílení:** data (`src/data`) se tvoří ve webu a do aplikace se kopírují `npm run sync:data`. Odkazy mezi projekty
  řeší přesměrování v `next.config.ts` a v aplikaci komponenta `@/components/ui/Link`.

## Phase 1 — scaffold, rename, i18n, auth, onboarding, schema (2026-11-16)

- **Built on the existing FLX app, not a fresh repo.** Anatomy, nutrient, food, absorption and looksmaxing modules
  already exist and are tested; the new app lives alongside them. Work happens on branch `blwb-app` so the live site
  on `main` (better-live-web.vercel.app) is untouched until the app is ready.
- **Route groups.** `(site)` = public, indexable education pages with the site nav/footer; `(app)` = signed-in app
  with sidebar (desktop) and bottom tabs (mobile); `(auth)` = login; `(onboarding)` = onboarding wizard. URLs are
  unchanged for existing pages.
- **No own store (owner decision).** The spec's organic store was replaced earlier by affiliate links (BrainMarket,
  Vilgain) and the owner chose to keep it that way. "Store" in the sidebar is labelled "Where to buy" and points to the
  affiliate catalogue. `products` holds the affiliate catalogue; `orders` exists but is unused.
- **Supabase in the cloud (EU, North EU / Stockholm).** Docker/Supabase CLI are not installed on the dev machine, so there is no
  local Supabase. Migrations are plain SQL in `supabase/migrations/` and are applied through the SQL editor (or
  `supabase db push` later). Until env vars are set, app routes show a setup screen instead of failing.
- **i18n with next-intl, locale in a cookie, no locale in URLs.** Czech is the default; English via the switch (or
  the browser's `Accept-Language` on first visit). Public education content in `src/data` is still Czech-only — it
  will get English fields when it is ported into the app modules (phase 2).
- **Auth:** email + password and Google OAuth via `@supabase/ssr` (cookie sessions, middleware refresh). Google needs
  an OAuth client configured in Google Cloud + Supabase (README). Magic links were skipped to keep one flow.
- **Adults only, enforced twice:** zod validation in onboarding and a database trigger (`check_adult`) that rejects
  birth dates under 18.
- **Health-data consent (GDPR Art. 9)** is a separate checkbox from terms, stored in an append-only `consents` log
  (users can insert and read, never update/delete). The app requires the latest `health_data` consent to be granted;
  withdrawing it in Settings sends the user back to the consent step.
- **Data minimisation:** medications are a single free-text field used only for safety checks; no IP addresses or
  device data are stored with consents.
- **RLS everywhere.** Every table has RLS enabled. User tables carry `user_id default auth.uid()` so policies are a
  single `user_id = auth.uid()` check (also on child tables, which keeps offline sync simple). Shared libraries
  (exercises, foods, recipes, mobility) use `owner_id null` for global rows plus user-owned custom rows.
  `ai_usage` and `subscriptions` are server-written only. Verified by `npm run test:rls` against the real project.
- **Offline-ready ids:** `client_id` columns (unique) on workouts, sets, sport sessions and food logs so writes queued
  offline can be replayed idempotently (phase 8).
- **Account deletion** uses the service role to delete storage files and the auth user; all user tables cascade.
- **Unit tests with Vitest** (node environment); e2e stays on Playwright with a separate `.next-test` build folder.
- **Database types** are hand-written for the tables used so far; regenerate with `supabase gen types` once the
  project is linked.

## Phases 2–8

- **Test-only preview route.** Signed-in screens are rendered with sample data at `/preview/<screen>` so Playwright
  can test and screenshot them without a real login. It returns 404 unless `ENABLE_PREVIEW=1` (set only in the
  Playwright web server), and `/api/preview/coach` runs only the safety screen — no model, no database.
- **Exercise library is code-first** (`src/data/exercises`, 179 exercises) and seeded into `exercises`
  (`npm run seed:reference`). Technique steps for most exercises are generated from movement patterns; hand-written
  cues exist for the main lifts. A muscle heat-map on the Body tab is deferred.
- **Offline workout logger.** The active session lives in a persisted zustand store; finished workouts go to a queue
  and are upserted with `client_id` (idempotent). If the device is offline when a workout is finished, the logger
  stays on a "saved on this device" screen instead of navigating (a route change needs the server), and the queue
  syncs on load and on `online`. The service worker additionally caches visited app pages for offline use.
- **Food diary** stores a nutrition snapshot per entry. `food_logs.title` holds `name|slug` so the UI can show the
  localised name for catalogue foods without another join.
- **Calorie targets** use Mifflin–St Jeor; the target is never below BMR and the deficit never above ~0.75 % body
  weight per week. Very low BMI or a weight-loss goal with an underweight BMI shows support resources instead of a
  deficit.
- **Supplements:** EFSA upper limits, a medication-interaction check on the free-text medication field (regex
  categories), and a hard exclusion list (steroids, SARMs, DNP, …) that cannot be added.
- **Pain map:** red-flag screening comes first; any "yes" shows an emergency or see-a-doctor gate and no exercises.
- **Labs.** A 30-marker catalogue (`src/lib/labs/markers.ts`) with Czech-lab canonical units (µkat/L for liver
  enzymes, IFCC mmol/mol for HbA1c), unit conversion, flags that prefer the lab's own range, and critical limits.
  Pasted text is parsed on the device; PDFs and photos are read by Claude with structured outputs (Pro feature when
  `FREE_MODE` is off). Nothing is stored until the user reviews and confirms each row; uncertain rows start
  unchecked. Originals go to the private `lab-reports` bucket under the user's id.
- **AI coach.** `system-prompt.md` holds the rules (no diagnosis, red flags → care, no PEDs, BMR floor, eating-disorder
  and self-harm handling). Before the model is called, messages are screened: emergencies and self-harm get a fixed,
  reviewed reply and never reach the model; eating-disorder signals add an instruction for that turn. The model gets
  read-only tools over the user's own rows through the user's Supabase client (RLS applies); the free-text
  medication list is never sent, only interaction categories. Requests use the beta endpoint with server-side refusal
  fallback. Daily caps are counted from the user's own messages (no service key needed); token totals go to
  `ai_usage` when the service key is present. Replies are not streamed yet (one JSON response per turn).
- **Model:** `ANTHROPIC_MODEL`, default `claude-opus-5-5`.
- **Billing:** `FREE_MODE` (default on) unlocks everything. Without it, Free keeps the core app and the coach at
  10 messages/day; Pro adds AI report reading and 100 messages/day. Payments (Stripe) are not wired yet — Settings
  says so honestly; `subscriptions` is server-written only.
- **PWA:** web manifest, generated PNG icons, `public/sw.js` (static assets cache-first; app pages network-first with
  cached fallback and `/offline`; API, auth and preview routes never cached). The page cache is cleared when the user
  reaches `/login`, so personal pages do not outlive a sign-out on shared devices. Registered in production only.
- **Today** shows real data (week's workouts vs. planned days, kcal/protein vs. targets, supplements taken, last pain
  score, out-of-range labs) with one rule-based nudge, plus a daily sleep/recovery check-in (`sleep_logs`,
  `recovery_logs`).
- **Looks** is a daily checklist of the six evidence-based habits from the looksmaxing guide, stored on the device
  only (it is not health data). Its content is Czech-only for now, like the public education pages.

## Plans: Free and Pro (2026-11-16)

- **One place decides access:** `src/lib/billing.ts` (`PRO_FEATURES`, `hasAccess`, `coachDailyLimit`, `PRICES`);
  `src/lib/plan.ts` (`getPlan`, `gate`) reads the user's `subscriptions` row server-side.
- **Free forever:** encyclopedia, training log, food diary, supplements, pain/mobility, weight & measurements,
  manual lab results, data export. **Pro (199 Kč/month, 1 690 Kč/year incl. VAT):** AI coach without a daily
  limit (free: 5/day), AI lab-report reading, training progress charts, progress photos.
- **Beta:** `FREE_MODE` defaults to true, so everything is open; pages show "PRO" badges and `/pricing` explains
  the plans with a beta banner. Setting `FREE_MODE=false` turns on the paywall (`components/app/Paywall.tsx`)
  on gated pages and 402 responses in the AI routes. Locked users keep all their data.
- **Not built yet:** a payment provider. Planned: Stripe Checkout + Customer Portal writing `subscriptions`
  via webhook (service role). Nothing is charged automatically when payments launch — users opt in.
