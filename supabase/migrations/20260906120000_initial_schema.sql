-- ============================================================================
-- Routini — 0001_initial_schema
-- Cloud-first foundation: profiles + the entities that already exist locally.
-- SOURCE OF TRUTH. Every table is per-user and protected by Row-Level Security.
--
-- REVIEW BEFORE RUNNING. Apply in the Supabase SQL Editor (or `supabase db push`
-- once the project is linked). This file is additive and safe to run once on a
-- fresh project. It does NOT touch any local IndexedDB data.
--
-- Conventions on every domain table:
--   id          uuid  primary key                (client-generated UUID)
--   user_id     uuid  not null  -> auth.users     (RLS key, cascade delete)
--   created_at  timestamptz not null default now()
--   updated_at  timestamptz not null default now()   (bumped by trigger)
--   deleted_at  timestamptz                           (soft-delete tombstone for sync)
--   version     integer not null default 1            (bumped by trigger; optimistic concurrency)
-- Flexible/nested shapes (reminders[], recurrence, target, participants) are
-- stored as jsonb to mirror the client models 1:1.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    new.version := coalesce(old.version, 1) + 1;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles  (1 row per user; holds the settings blob)
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text,
  locale        text not null default 'ar',
  settings      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- auto-create a profile row when a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
drop policy if exists "profiles: owner read"   on public.profiles;
drop policy if exists "profiles: owner write"  on public.profiles;
create policy "profiles: owner read"  on public.profiles for select using (id = auth.uid());
create policy "profiles: owner write" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
-- insert is handled by the trigger (security definer); no public insert policy.

-- ---------------------------------------------------------------------------
-- domain tables
-- ---------------------------------------------------------------------------

create table if not exists public.task_categories (
  id          uuid primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  color       text not null default 'slate',
  "order"     integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  version     integer not null default 1
);

create table if not exists public.tasks (
  id                   uuid primary key,
  user_id              uuid not null references auth.users (id) on delete cascade,
  title                text not null,
  notes                text,
  due_at               timestamptz,
  has_time             boolean not null default false,
  duration_minutes     integer,
  priority             text not null default 'normal' check (priority in ('important','normal','later')),
  status               text not null default 'pending' check (status in ('pending','completed','carried_over','cancelled')),
  completed_at         timestamptz,
  recurrence           jsonb,
  reminders            jsonb not null default '[]'::jsonb,
  linked_appointment_id uuid,
  origin_task_id       uuid,
  category_id          uuid references public.task_categories (id) on delete set null,
  pinned               boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  deleted_at           timestamptz,
  version              integer not null default 1
);
create index if not exists tasks_user_due_idx      on public.tasks (user_id, due_at);
create index if not exists tasks_user_status_idx   on public.tasks (user_id, status);

create table if not exists public.appointments (
  id                    uuid primary key,
  user_id               uuid not null references auth.users (id) on delete cascade,
  title                 text not null,
  notes                 text,
  location              text,
  start_at              timestamptz not null,
  end_at                timestamptz not null,
  all_day               boolean not null default false,
  recurrence            jsonb,
  recurrence_parent_id  uuid,
  reminders             jsonb not null default '[]'::jsonb,
  participants          jsonb not null default '[]'::jsonb,
  color                 text,
  calendar_provider_id  text not null default 'local',
  external_id           text,
  device_calendar_id    text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz,
  version               integer not null default 1
);
create index if not exists appts_user_start_idx on public.appointments (user_id, start_at);

create table if not exists public.habits (
  id          uuid primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null,
  notes       text,
  recurrence  jsonb not null,
  time_of_day text,
  target      jsonb,
  reminders   jsonb not null default '[]'::jsonb,
  color       text,
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  version     integer not null default 1
);

create table if not exists public.habit_completions (
  id           uuid primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  habit_id     uuid not null references public.habits (id) on delete cascade,
  date         date not null,
  completed_at timestamptz not null default now(),
  value        numeric,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  version      integer not null default 1,
  unique (user_id, habit_id, date)
);
create index if not exists habit_completions_user_date_idx on public.habit_completions (user_id, date);

create table if not exists public.dhikr_categories (
  id         uuid primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  kind       text not null check (kind in ('morning','evening','after_prayer','sleep','wake','istighfar','custom')),
  title      text not null,
  "order"    integer not null default 0,
  is_custom  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version    integer not null default 1
);

create table if not exists public.adhkar (
  id              uuid primary key,
  user_id         uuid not null references auth.users (id) on delete cascade,
  category_id     uuid not null references public.dhikr_categories (id) on delete cascade,
  text            text not null,
  transliteration text,
  translation     text,
  target_count    integer not null default 1,
  source          text,
  "order"         integer not null default 0,
  is_custom       boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  version         integer not null default 1
);

create table if not exists public.dhikr_progress (
  id           uuid primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  dhikr_id     uuid not null references public.adhkar (id) on delete cascade,
  date         date not null,
  count        integer not null default 0,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  version      integer not null default 1,
  unique (user_id, dhikr_id, date)
);
create index if not exists dhikr_progress_user_date_idx on public.dhikr_progress (user_id, date);

-- ---------------------------------------------------------------------------
-- updated_at / version triggers + RLS + realtime  (loop over the domain tables)
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
  domain_tables text[] := array[
    'task_categories','tasks','appointments','habits','habit_completions',
    'dhikr_categories','adhkar','dhikr_progress'
  ];
begin
  foreach t in array domain_tables loop
    -- updated_at / version trigger
    execute format('drop trigger if exists trg_%1$s_updated_at on public.%1$I;', t);
    execute format(
      'create trigger trg_%1$s_updated_at before update on public.%1$I
         for each row execute function public.set_updated_at();', t);

    -- RLS
    execute format('alter table public.%1$I enable row level security;', t);
    execute format('drop policy if exists "%1$s: owner all" on public.%1$I;', t);
    execute format(
      'create policy "%1$s: owner all" on public.%1$I
         for all
         using (user_id = auth.uid())
         with check (user_id = auth.uid());', t);

    -- Realtime (ignore if already a member of the publication)
    begin
      execute format('alter publication supabase_realtime add table public.%1$I;', t);
    exception when duplicate_object then
      null;
    end;
  end loop;
end;
$$;

-- profiles realtime (owner sees their own settings changes on other devices)
do $$
begin
  alter publication supabase_realtime add table public.profiles;
exception when duplicate_object then
  null;
end;
$$;

-- ============================================================================
-- NOTES
-- - Later migrations (0002+) add: life_areas, goals, goal_milestones, measurements,
--   daily_plans, daily_energy, reviews, achievements, devices, integrations,
--   ai_conversations, ai_memory, ai_actions, health_data_refs — same conventions.
-- - The service_role key is never used by the app client. Edge Functions that
--   need elevated access get it from the Supabase secret store, never from git.
-- ============================================================================
