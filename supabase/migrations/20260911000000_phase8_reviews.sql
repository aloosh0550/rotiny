-- ============================================================================
-- Routini — 0007_phase8_reviews  (additive)
--
-- reviews       — a saved Daily / Weekly / Monthly review (deterministic
--                 metrics blob + an optional single AI sentence added later).
--                 id = "<user_id>:<period>:<period_key>".
-- achievements  — calm, positive milestones. id = "<user_id>:<key>".
--                 `progress` = { current, target }; `unlocked_at` set once.
--
-- All per-user + RLS + set_updated_at trigger (both have `version`) + realtime.
-- No existing table or row is touched.
-- ============================================================================

create table if not exists public.reviews (
  id          text primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  period      text not null check (period in ('day','week','month')),
  period_key  text not null,
  metrics     jsonb not null default '{}'::jsonb,
  ai_note     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  version     integer not null default 1,
  unique (user_id, period, period_key)
);
create index if not exists reviews_user_period_idx on public.reviews (user_id, period, period_key);

create table if not exists public.achievements (
  id          text primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  key         text not null,
  unlocked_at timestamptz,
  progress    jsonb not null default '{"current":0,"target":0}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  version     integer not null default 1,
  unique (user_id, key)
);

do $$
declare t text;
begin
  foreach t in array array['reviews','achievements'] loop
    execute format('drop trigger if exists trg_%1$s_updated_at on public.%1$I;', t);
    execute format('create trigger trg_%1$s_updated_at before update on public.%1$I
                      for each row execute function public.set_updated_at();', t);
    execute format('alter table public.%1$I enable row level security;', t);
    execute format('drop policy if exists "%1$s: owner all" on public.%1$I;', t);
    execute format('create policy "%1$s: owner all" on public.%1$I
                      for all using (user_id = auth.uid()) with check (user_id = auth.uid());', t);
    begin
      execute format('alter publication supabase_realtime add table public.%1$I;', t);
    exception when duplicate_object then null;
    end;
  end loop;
end;
$$;
