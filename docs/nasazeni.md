# Nasazení aplikace na Vercel

Aplikace je samostatný projekt. Web (BETTER-LIVE-WEB-) běží dál na své adrese. Postup zabere asi 15 minut.

## 1. Nový projekt na Vercelu

1. <https://vercel.com/new> → **Import Git Repository** → vyberte `Miskus111/BETTER-LIVE-WITH-BIOHACKIN-APP-`.
2. Framework se rozpozná sám (Next.js). Region se nastaví z `vercel.json` na Stockholm (`arn1`), vedle databáze.
3. Než kliknete na **Deploy**, otevřete **Environment Variables** a vyplňte bod 2.

## 2. Proměnné prostředí

Hodnoty Supabase najdete v Supabase → Project Settings → API (stejné jako ve stávajícím projektu webu).

| Proměnná                        | Hodnota                                                   | Tajná?             |
| ------------------------------- | --------------------------------------------------------- | ------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | `https://<projekt>.supabase.co`                           | ne                 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key                                                  | ne (chrání ji RLS) |
| `SUPABASE_SERVICE_ROLE_KEY`     | service role key                                          | **ano**            |
| `ANTHROPIC_API_KEY`             | klíč z console.anthropic.com (AI kouč, čtení výsledků)    | **ano**            |
| `FREE_MODE`                     | `true` (beta: vše zdarma)                                 | ne                 |
| `NEXT_PUBLIC_WEB_URL`           | adresa webu, např. `https://better-live-web.vercel.app`   | ne                 |
| `NEXT_PUBLIC_SITE_URL`          | adresa této aplikace (doplníte po prvním nasazení, bod 4) | ne                 |

Volitelné: `ANTHROPIC_MODEL`, `COACH_DAILY_MESSAGE_LIMIT`, `NEXT_PUBLIC_AFF_BRAINMARKET`, `NEXT_PUBLIC_AFF_VILGAIN`,
`NEXT_PUBLIC_GOOGLE_AUTH` = `1` (tlačítko „Přihlásit přes Google“ — nejdřív zapněte poskytovatele Google v Supabase →
Authentication → Providers).
**Nikdy** nenastavujte `ENABLE_PREVIEW` — zapíná testovací obrazovky bez přihlášení.

## 3. Supabase: přesměrování po přihlášení

Supabase → Authentication → URL Configuration:

- **Site URL**: adresa aplikace (např. `https://better-live-app.vercel.app`).
- **Redirect URLs**: přidejte `https://<adresa aplikace>/auth/callback`.

Bez toho nefunguje potvrzení registrace, obnova hesla ani přihlášení přes Google.

Doporučeno tamtéž: Authentication → Email Templates přeložit „Confirm signup“ a „Reset Password“ do češtiny;
Authentication → Settings zapnout ochranu proti uniklým heslům.

## 4. Po prvním nasazení

1. Zkopírujte adresu aplikace z Vercelu (Project → Domains) a doplňte ji do `NEXT_PUBLIC_SITE_URL`, pak
   **Redeploy**.
2. Na projektu **webu** nastavte `NEXT_PUBLIC_APP_URL` na stejnou adresu a sloučte PR #1 v BETTER-LIVE-WEB-
   (web bez aplikace). Od té chvíle tlačítka „Přihlásit“ a „Zapsat do jídelníčku“ vedou do aplikace a staré
   adresy aplikace na webu se přesměrují.

## 5. Kontrola

- `https://<aplikace>/login` se otevře, registrace pošle e-mail, odkaz z e-mailu vás přihlásí.
- Na webu u potraviny „Zapsat do jídelníčku“ → přihlášení → jídelníček s potravinou.
- `https://<aplikace>/robots.txt` zakazuje indexaci (aplikace je soukromá).

## Databáze (jednou, ručně)

Migrace `20261119000000_ai_usage_atomic.sql` a `20261121000000_advisor_hardening.sql` zatím nejsou v produkční
databázi. Spusťte je v Supabase → SQL Editor (v tomto pořadí), nebo `supabase db push`. Po změně schématu se
podívejte do Supabase → Advisors.
