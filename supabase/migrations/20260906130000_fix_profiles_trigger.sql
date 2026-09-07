-- ============================================================================
-- Routini — 0002_fix_profiles_trigger  (additive, idempotent, non-destructive)
--
-- Ensures the hosted DB has the profiles fix from the initial migration:
-- `set_updated_at_simple()` (updated_at only) instead of the shared
-- `set_updated_at()` which also bumps `version` — a column profiles does not
-- have, so every profile UPDATE 400'd.
--
-- Safe to run whether or not the fix is already present:
--   - CREATE OR REPLACE FUNCTION  → no-op if identical
--   - DROP TRIGGER IF EXISTS / CREATE TRIGGER → re-points, no data touched
--   - realtime publication adds are wrapped to ignore "already a member"
-- No table is created, altered, or dropped. No row is touched.
-- ============================================================================

-- 1. the profiles-safe trigger function
create or replace function public.set_updated_at_simple()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- 2. point the profiles trigger at it
drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at_simple();

-- 3. belt-and-suspenders: make sure every synced table is in the realtime publication
do $$
declare
  t text;
  tbls text[] := array[
    'profiles','task_categories','tasks','appointments','habits','habit_completions',
    'dhikr_categories','adhkar','dhikr_progress'
  ];
begin
  foreach t in array tbls loop
    begin
      execute format('alter publication supabase_realtime add table public.%I;', t);
    exception when duplicate_object then null;
    end;
  end loop;
end;
$$;

-- 4. report the resulting state (visible in the SQL Editor output)
do $$
declare
  n_tables   int;
  n_rls      int;
  n_policies int;
  n_vers_trg int;
  prof_fn    text;
  n_realtime int;
begin
  select count(*) into n_tables   from pg_tables where schemaname='public'
    and tablename in ('profiles','task_categories','tasks','appointments','habits',
                      'habit_completions','dhikr_categories','adhkar','dhikr_progress');
  select count(*) into n_rls      from pg_tables where schemaname='public' and rowsecurity
    and tablename in ('profiles','task_categories','tasks','appointments','habits',
                      'habit_completions','dhikr_categories','adhkar','dhikr_progress');
  select count(*) into n_policies from pg_policies where schemaname='public';
  select count(*) into n_vers_trg from pg_trigger  where tgname like 'trg_%_updated_at' and not tgisinternal;
  select p.proname into prof_fn
    from pg_trigger tg
    join pg_proc p on p.oid = tg.tgfoid
    where tg.tgname = 'trg_profiles_updated_at' and not tg.tgisinternal;
  select count(*) into n_realtime from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public';

  raise notice '--- Routini schema check ---';
  raise notice 'tables (of 9):            %', n_tables;
  raise notice 'RLS-enabled (of 9):       %', n_rls;
  raise notice 'policies:                 %', n_policies;
  raise notice 'updated_at triggers:      %', n_vers_trg;
  raise notice 'profiles trigger fn:      %  (expect: set_updated_at_simple)', prof_fn;
  raise notice 'tables in realtime pub:   %', n_realtime;
  raise notice 'handle_new_user trigger:  %',
    (select count(*) from pg_trigger where tgname='on_auth_user_created' and not tgisinternal);
end;
$$;
