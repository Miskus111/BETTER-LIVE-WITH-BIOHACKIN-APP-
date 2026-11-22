/**
 * Runs every migration in supabase/migrations on a throwaway Postgres 17 (PGlite, in memory) with minimal
 * stand-ins for what Supabase provides (auth.users, auth.uid(), storage, roles), then checks the important
 * outcomes: hardening applied, registration still creates a profile, AI usage limits hold. No real database is
 * touched. `npm run test:migrations`
 */
import { PGlite } from '@electric-sql/pglite'
import { readdirSync, readFileSync } from 'node:fs'
const dir = new URL('../supabase/migrations/', import.meta.url).pathname
const db = new PGlite()
// minimal stand-ins for what Supabase provides
await db.exec(`
  create role anon; create role authenticated; create role service_role;
  create schema auth; create schema storage; create schema extensions;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}'::jsonb, created_at timestamptz default now());
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create table storage.buckets (id text primary key, name text, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name, '/') $$;
`)
for (const f of readdirSync(dir)
  .filter((x) => x.endsWith('.sql'))
  .sort()) {
  let sql = readFileSync(dir + f, 'utf8').replace(/create extension if not exists pgcrypto[^;]*;/gi, '')
  try {
    await db.exec(sql)
    console.log('✓', f)
  } catch (e) {
    console.log('✗', f, '—', e.message)
    process.exit(1)
  }
}
// what the hardening should have achieved
const idx = await db.query(
  `select count(*)::int n from pg_indexes where schemaname='public' and indexname like '%_idx'`,
)
const sp = await db.query(
  `select proname, proconfig from pg_proc where proname in ('set_updated_at','check_adult')`,
)
const ex = await db.query(
  `select has_function_privilege('anon','public.handle_new_user()','execute') anon, has_function_privilege('authenticated','public.handle_new_user()','execute') auth`,
)
const ok = (cond, msg) => {
  if (!cond) {
    console.log('✗', msg)
    process.exit(1)
  }
  console.log('✓', msg)
}
ok(idx.rows[0].n >= 32, `foreign-key indexes (${idx.rows[0].n})`)
ok(
  sp.rows.every((r) => String(r.proconfig).includes('search_path')),
  'functions have a fixed search_path',
)
ok(!ex.rows[0].anon && !ex.rows[0].auth, 'handle_new_user is not callable through the API')
// registration still creates a profile through the trigger
await db.exec(
  `insert into auth.users (email, raw_user_meta_data) values ('test@example.test', '{"display_name":"Test"}')`,
)
const prof = await db.query(`select count(*)::int n from public.profiles`)
ok(prof.rows[0].n === 1, 'registration still creates a profile (trigger)')
// running the hardening a second time is harmless
await db.exec(readFileSync(dir + '20261121000000_advisor_hardening.sql', 'utf8'))
console.log('✓ hardening re-run is idempotent')
// AI usage: three calls allowed with limit 3, the fourth refused; tokens add up
const u = (await db.query(`select id from auth.users limit 1`)).rows[0].id
const res = []
for (let i = 0; i < 4; i++)
  res.push((await db.query(`select public.reserve_ai_call($1, '2026-11-22', 3) ok`, [u])).rows[0].ok)
await db.query(`select public.add_ai_tokens($1, '2026-11-22', 100, 50)`, [u])
await db.query(`select public.add_ai_tokens($1, '2026-11-22', 10, 5)`, [u])
const row = (await db.query(`select * from public.ai_usage where user_id = $1`, [u])).rows[0]
ok(JSON.stringify(res) === '[true,true,true,false]', 'AI calls stop at the daily limit')
ok(row.messages === 3 && row.input_tokens === 110 && row.output_tokens === 55, 'AI token usage adds up')
