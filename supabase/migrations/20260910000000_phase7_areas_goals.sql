-- ============================================================================
-- Routini — 0006_phase7_areas_goals  (additive)
--
-- life_areas       — customizable life domains (name / icon / colour / order /
--                    enabled / kind). Adhkar/Exercise/Habits seed by default.
-- goals            — long-term → monthly → weekly goals, optionally under a Life
--                    Area, optionally nested (parent_goal_id).
-- goal_milestones  — ordered checkpoints under a goal; progress rolls up from
--                    these + linked measurements + linked task completion.
--
-- All per-user, RLS, set_updated_at trigger (all have `version`), realtime.
-- No existing table or row is touched. `tasks`/`habits` already carry the
-- nullable life_area_id / goal_id columns (Phases 5–6); no FK is added here so
-- the migration can never fail on pre-existing data — integrity is app-level.
-- ============================================================================

create table if not exists public.life_areas (
  id          uuid primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  key         text not null,
  name        text not null,
  icon        text not null default 'circle',
  color       text not null default 'slate',
  "order"     integer not null default 0,
  enabled     boolean not null default true,
  kind        text not null default 'custom',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  version     integer not null default 1,
  unique (user_id, key)
);

create table if not exists public.goals (
  id             uuid primary key,
  user_id        uuid not null references auth.users (id) on delete cascade,
  life_area_id   uuid,
  parent_goal_id uuid,
  title          text not null,
  description    text,
  horizon        text not null default 'month' check (horizon in ('long','month','week')),
  target_value   numeric,
  target_unit    text,
  deadline       date,
  status         text not null default 'active' check (status in ('active','done','paused','dropped')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz,
  version        integer not null default 1
);
create index if not exists goals_user_area_idx    on public.goals (user_id, life_area_id);
create index if not exists goals_user_horizon_idx on public.goals (user_id, horizon);

create table if not exists public.goal_milestones (
  id            uuid primary key,
  user_id       uuid not null references auth.users (id) on delete cascade,
  goal_id       uuid not null references public.goals (id) on delete cascade,
  title         text not null,
  target_value  numeric,
  current_value numeric not null default 0,
  done          boolean not null default false,
  "order"       integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  version       integer not null default 1
);
create index if not exists goal_milestones_user_goal_idx on public.goal_milestones (user_id, goal_id);

do $$
declare t text;
begin
  foreach t in array array['life_areas','goals','goal_milestones'] loop
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
