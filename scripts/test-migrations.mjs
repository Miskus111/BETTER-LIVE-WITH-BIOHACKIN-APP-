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

// --- isolation between users (RLS): user A must not see, change or write user B's rows in any user table
// generic row builder: satisfies NOT NULL, IN-list checks and foreign keys using existing rows
async function isolationCheck(db) {
  await db.exec(
    `grant usage on schema public to authenticated, anon; grant all on all tables in schema public to authenticated; grant select on all tables in schema public to anon;`,
  )
  const A = (await db.query(`insert into auth.users (email) values ('a@example.test') returning id`)).rows[0]
    .id
  const B = (await db.query(`insert into auth.users (email) values ('b@example.test') returning id`)).rows[0]
    .id
  const all = (
    await db.query(
      `select c.relname t, exists(select 1 from information_schema.columns col where col.table_schema='public' and col.table_name=c.relname and col.column_name='user_id') uid from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'`,
    )
  ).rows
  const base = {
    uuid: 'gen_random_uuid()',
    text: `'x'`,
    integer: '1',
    smallint: '1',
    bigint: '1',
    numeric: '1',
    real: '1',
    'double precision': '1',
    date: 'current_date',
    'timestamp with time zone': 'now()',
    time: `'08:00'`,
    'time without time zone': `'08:00'`,
    boolean: 'false',
    jsonb: `'{}'::jsonb`,
    ARRAY: `'{}'`,
    'USER-DEFINED': null,
  }
  const rowFor = async (t, owner) => {
    const cols = (
      await db.query(
        `select column_name c, data_type d from information_schema.columns where table_schema='public' and table_name=$1 and is_nullable='NO' and column_default is null`,
        [t],
      )
    ).rows
    const checks = (
      await db.query(
        `select pg_get_constraintdef(oid) def from pg_constraint where conrelid = ('public.'||$1)::regclass and contype='c'`,
        [t],
      )
    ).rows.map((r) => r.def)
    const fks = (
      await db.query(
        `select a.attname col, confrelid::regclass::text ref from pg_constraint c join pg_attribute a on a.attrelid=c.conrelid and a.attnum=c.conkey[1] where c.conrelid=('public.'||$1)::regclass and c.contype='f'`,
        [t],
      )
    ).rows
    const names = [],
      vals = []
    for (const { c, d } of cols) {
      let v
      if (c === 'user_id') v = `'${owner}'`
      const fk = fks.find((f) => f.col === c)
      if (!v && fk) {
        const refUser = all.find((x) => 'public.' + x.t === fk.ref || x.t === fk.ref)?.uid
        const q = refUser
          ? `select id from ${fk.ref} where user_id = '${owner}' limit 1`
          : `select id from ${fk.ref} limit 1`
        const id = (await db.query(q).catch(() => ({ rows: [] }))).rows[0]?.id
        if (!id) return null
        v = `'${id}'`
      }
      if (!v) {
        const inList = checks
          .map(
            (ch) =>
              ch.match(new RegExp(`\\(?${c}\\)?\\s*=\\s*ANY\\s*\\(\\(?ARRAY\\['([^']+)'`)) ||
              ch.match(new RegExp(`${c}\\s*=\\s*'([^']+)'`)),
          )
          .find(Boolean)
        v = inList ? `'${inList[1]}'` : base[d]
      }
      if (v == null) return null
      names.push(c)
      vals.push(v)
    }
    if (!names.includes('user_id') && all.find((x) => x.t === t)?.uid) {
      names.push('user_id')
      vals.push(`'${owner}'`)
    }
    return `insert into public.${t} (${names.join(',')}) values (${vals.join(',')})`
  }
  // seed global (no user_id) tables first, then user tables in several passes so parents exist before children
  const pending = new Set(all.map((x) => x.t)),
    ready = new Set()
  for (let pass = 0; pass < 6 && pending.size; pass++)
    for (const t of [...pending]) {
      const uid = all.find((x) => x.t === t).uid
      const exists = uid
        ? (await db.query(`select 1 from public.${t} where user_id = $1 limit 1`, [B])).rows.length
        : (await db.query(`select 1 from public.${t} limit 1`)).rows.length
      if (exists) {
        pending.delete(t)
        ready.add(t)
        continue
      }
      const sql = await rowFor(t, B)
      if (!sql) continue
      try {
        await db.exec(sql)
        pending.delete(t)
        ready.add(t)
      } catch {
        /* retry next pass */
      }
    }
  const out = []
  for (const t of all.filter((x) => x.uid).map((x) => x.t)) {
    if (!ready.has(t)) {
      out.push([t, 'not covered'])
      continue
    }
    const ins = await rowFor(t, B)
    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${A}', false);`)
    const seen = (await db.query(`select count(*)::int n from public.${t} where user_id = '${B}'`)).rows[0].n
    const upd = (
      await db
        .query(`update public.${t} set user_id = '${A}' where user_id = '${B}' returning 1`)
        .catch(() => ({ rows: [] }))
    ).rows.length
    let wrote = false
    if (ins)
      try {
        await db.exec(ins)
        wrote = true
      } catch {
        wrote = false
      }
    await db.exec(`reset role;`)
    out.push([
      t,
      seen === 0 && upd === 0 && !wrote
        ? 'isolated'
        : `LEAK seen=${seen} updated=${upd} wroteAsOther=${wrote}`,
    ])
  }
  return out
}

if (process.env.RLS_SELFTEST === '1') await db.exec('alter table public.food_logs disable row level security') // proves the check catches a leak
const iso = await isolationCheck(db)
const leaks = iso.filter(([, s]) => s !== 'isolated')
for (const [t, s] of leaks) console.log('  ', t, '—', s)
ok(leaks.length === 0, `every user table isolated between users (${iso.length - leaks.length}/${iso.length})`)
{
  const [a, b] = (
    await db.query(
      `select id from auth.users where email in ('a@example.test','b@example.test') order by email`,
    )
  ).rows.map((r) => r.id)
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${a}', false);`)
  const other = (await db.query(`select count(*)::int n from public.profiles where id = $1`, [b])).rows[0].n
  const own = (await db.query(`select count(*)::int n from public.profiles where id = $1`, [a])).rows[0].n
  await db.exec('reset role;')
  ok(other === 0 && own === 1, 'profiles: own profile visible, others not')
}

// --- private files (progress photos, lab reports): only files under "<own user id>/…" are readable or writable
{
  await db.exec(
    'grant select, insert, delete on storage.objects to authenticated; grant usage on schema storage to authenticated;',
  )
  // proves the check catches a leak: an extra policy that lets everyone read every file
  if (process.env.STORAGE_SELFTEST === '1')
    await db.exec(`create policy leak on storage.objects for select to authenticated using (true)`)
  const [a, b] = (
    await db.query(
      `select id from auth.users where email in ('a@example.test','b@example.test') order by email`,
    )
  ).rows.map((r) => r.id)
  const buckets = (
    await db.query(`select id, public from storage.buckets where id in ('progress-photos','lab-reports')`)
  ).rows
  ok(buckets.length === 2 && buckets.every((x) => !x.public), 'photo and lab buckets exist and are private')
  await db.exec(
    `insert into storage.objects (bucket_id, name) values ('progress-photos', '${b}/front.jpg'), ('lab-reports', '${b}/report.pdf'), ('progress-photos', '${a}/front.jpg')`,
  )
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${a}', false);`)
  const visible = (await db.query(`select name from storage.objects`)).rows.map((r) => r.name)
  let wroteForOther = true
  try {
    await db.exec(
      `insert into storage.objects (bucket_id, name) values ('progress-photos', '${b}/planted.jpg')`,
    )
  } catch {
    wroteForOther = false
  }
  const deleted = (await db.query(`delete from storage.objects where name like '${b}/%' returning 1`)).rows
    .length
  await db.exec('reset role;')
  ok(
    visible.length === 1 && visible[0] === `${a}/front.jpg`,
    'files: a user sees only their own photos and lab reports',
  )
  ok(!wroteForOther && deleted === 0, "files: a user can't upload into or delete from someone else's folder")
}
