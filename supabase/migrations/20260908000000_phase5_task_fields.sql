-- ============================================================================
-- Routini — 0004_phase5_task_fields  (additive)
--
-- New optional columns on `tasks`:
--   life_area_id  uuid   — links a task to a Life Area   (Phase 7 table)
--   goal_id       uuid   — links a task to a Goal        (Phase 7 table)
--   energy_cost   text   — "low" | "med" | "high"        (feeds the planner)
--   context       jsonb  — free tags, e.g. ["home","errands"]
--   planned_for   date   — the day the user intends to do it (vs. its due date)
--
-- All nullable, no defaults that rewrite existing rows, no foreign keys yet
-- (life_areas / goals arrive in later migrations — add the FKs then). Existing
-- data is untouched. Safe to run once.
-- ============================================================================

alter table public.tasks
  add column if not exists life_area_id uuid,
  add column if not exists goal_id      uuid,
  add column if not exists energy_cost  text check (energy_cost in ('low','med','high')),
  add column if not exists context      jsonb not null default '[]'::jsonb,
  add column if not exists planned_for  date;

create index if not exists tasks_user_planned_for_idx on public.tasks (user_id, planned_for);
create index if not exists tasks_user_life_area_idx    on public.tasks (user_id, life_area_id);
