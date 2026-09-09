-- ============================================================================
-- Routini — 0005_phase6_measurements  (additive)
--
-- habits       += life_area_id, goal_id  (nullable, no FK yet — Phase 7 tables)
-- measurements — a per-day numeric log for anything with a current/target:
--                count/duration habits, first-class trackers (water / exercise /
--                reading), skills, goals. One row per (user, ref, day).
--
-- id is TEXT ("<user_id>:<ref_type>:<ref_id>:<YYYY-MM-DD>") so a day's value is
-- addressable and cross-device upserts dedupe on the primary key. Standard
-- per-user conventions: user_id + RLS + set_updated_at trigger (has `version`)
-- + realtime. No existing row is touched.
-- ============================================================================

alter table public.habits
  add column if not exists life_area_id uuid,
  add column if not exists goal_id      uuid,
  add column if not exists tracker_kind text
    check (tracker_kind in ('water','exercise','reading','skill'));

create index if not exists habits_user_life_area_idx on public.habits (user_id, life_area_id);

create table if not exists public.measurements (
  id          text primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  ref_type    text not null check (ref_type in ('habit','tracker','goal','custom')),
  ref_id      text not null,
  date        date not null,
  value       numeric not null default 0,
  unit        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  version     integer not null default 1,
  unique (user_id, ref_type, ref_id, date)
);
create index if not exists measurements_user_ref_idx  on public.measurements (user_id, ref_type, ref_id);
create index if not exists measurements_user_date_idx on public.measurements (user_id, date);

do $$
begin
  execute 'drop trigger if exists trg_measurements_updated_at on public.measurements';
  execute 'create trigger trg_measurements_updated_at before update on public.measurements
             for each row execute function public.set_updated_at()';

  execute 'alter table public.measurements enable row level security';
  execute 'drop policy if exists "measurements: owner all" on public.measurements';
  execute 'create policy "measurements: owner all" on public.measurements
             for all using (user_id = auth.uid()) with check (user_id = auth.uid())';

  begin
    execute 'alter publication supabase_realtime add table public.measurements';
  exception when duplicate_object then null;
  end;
end;
$$;
