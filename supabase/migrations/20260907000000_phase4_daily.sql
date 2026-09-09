-- ============================================================================
-- Routini — 0003_phase4_daily  (additive)
--
-- daily_plans  — one persisted plan per user per day (buckets + ordered items,
--                the deterministic Local Planner's output, editable + regenerable)
-- daily_energy — one self-reported energy level per user per day
--
-- id is TEXT ("<user_id>:<YYYY-MM-DD>") so the client can address a day's row
-- deterministically and cross-device upserts dedupe on the primary key.
-- Same per-user conventions as every other table: user_id + RLS + updated_at
-- trigger (no `version` column here → the profiles-safe trigger) + realtime.
-- No existing table is touched.
-- ============================================================================

create table if not exists public.daily_plans (
  id            text primary key,
  user_id       uuid not null references auth.users (id) on delete cascade,
  date          date not null,
  energy        text,
  generated_by  text not null default 'local',
  items         jsonb not null default '[]'::jsonb,
  regenerated_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  version       integer not null default 1,
  unique (user_id, date)
);
create index if not exists daily_plans_user_date_idx on public.daily_plans (user_id, date);

create table if not exists public.daily_energy (
  id          text primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  date        date not null,
  level       text not null check (level in ('high','good','medium','low')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  version     integer not null default 1,
  unique (user_id, date)
);
create index if not exists daily_energy_user_date_idx on public.daily_energy (user_id, date);

do $$
declare t text;
begin
  foreach t in array array['daily_plans','daily_energy'] loop
    execute format('drop trigger if exists trg_%1$s_updated_at on public.%1$I;', t);
    execute format(
      'create trigger trg_%1$s_updated_at before update on public.%1$I
         for each row execute function public.set_updated_at();', t);

    execute format('alter table public.%1$I enable row level security;', t);
    execute format('drop policy if exists "%1$s: owner all" on public.%1$I;', t);
    execute format(
      'create policy "%1$s: owner all" on public.%1$I
         for all using (user_id = auth.uid()) with check (user_id = auth.uid());', t);

    begin
      execute format('alter publication supabase_realtime add table public.%1$I;', t);
    exception when duplicate_object then null;
    end;
  end loop;
end;
$$;
