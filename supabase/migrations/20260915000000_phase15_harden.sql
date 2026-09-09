-- ============================================================================
-- Routini — 0011_phase15_harden  (corrective, idempotent, non-destructive)
--
-- Pins an immutable search_path on the trigger + signup helper functions
-- (Supabase advisor: `function_search_path_mutable`). No table, row, policy,
-- trigger or grant is changed — only the three function bodies are replaced
-- with search-path-safe versions. `create or replace function` keeps every
-- existing trigger binding intact.
--
-- Note: `coalesce` is a SQL construct (always available, not schema-scoped);
-- only real functions like `now()` need the `pg_catalog.` qualifier under an
-- empty search_path.
--
-- Safe to run once on a project that already has these functions.
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  if tg_op = 'UPDATE' then
    new.version := coalesce(old.version, 1) + 1;
  end if;
  return new;
end;
$$;

create or replace function public.set_updated_at_simple()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
