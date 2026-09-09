-- ============================================================================
-- Routini — 0010_phase11_ai_actions  (additive)
--
-- ai_actions — the audit log of every action the planner / assistant proposed
--   or applied. `status` ∈ proposed | applied | rejected | failed. `payload`
--   holds the action parameters; `reason` is the deterministic user-facing
--   explanation. The AI never writes here directly — the client pipeline does,
--   through RLS, after validating + policy-checking every action.
--
-- Per-user + RLS + set_updated_at trigger (has `version`) + realtime.
-- No existing table or row is touched. Client sync wiring (SYNCED_TABLES) stays
-- off until this migration is applied — the app logs to Dexie meanwhile.
-- ============================================================================

create table if not exists public.ai_actions (
  id               text primary key,
  user_id          uuid not null references auth.users (id) on delete cascade,
  kind             text not null,
  payload          jsonb not null default '{}'::jsonb,
  reason           text not null default '',
  status           text not null default 'proposed'
                     check (status in ('proposed','applied','rejected','failed')),
  autonomy_at_time text not null default 'conservative',
  source           text not null default 'planner'
                     check (source in ('planner','reschedule','assistant')),
  applied_at       timestamptz,
  error            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,
  version          integer not null default 1
);
create index if not exists ai_actions_user_idx on public.ai_actions (user_id, created_at desc);
create index if not exists ai_actions_user_status_idx on public.ai_actions (user_id, status);

do $$
declare t text;
begin
  foreach t in array array['ai_actions'] loop
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
