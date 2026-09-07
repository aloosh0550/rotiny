-- ============================================================================
-- Routini — 0008_phase9_ai  (additive)
--
-- ai_conversations — the assistant chat history. `messages` is a jsonb array of
--                    { role, content, ts }. id = a client uuid.
-- ai_memory        — user-managed AI memory. `kind` ∈ preference|pattern|fact,
--                    `enabled` lets the user switch a memory off without deleting
--                    it. Nothing is written here until an AI turn proposes it.
--
-- All per-user + RLS + set_updated_at trigger (both have `version`) + realtime.
-- No existing table or row is touched. The AI itself never talks to this DB —
-- these rows are written by the client through RLS, exactly like every other
-- synced entity.
-- ============================================================================

create table if not exists public.ai_conversations (
  id          text primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null default '',
  messages    jsonb not null default '[]'::jsonb,
  pinned      boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  version     integer not null default 1
);
create index if not exists ai_conversations_user_idx
  on public.ai_conversations (user_id, updated_at desc);

create table if not exists public.ai_memory (
  id          text primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  kind        text not null check (kind in ('preference','pattern','fact')),
  text        text not null,
  source      text,
  enabled     boolean not null default true,
  confidence  numeric,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  version     integer not null default 1
);
create index if not exists ai_memory_user_idx on public.ai_memory (user_id, enabled);

do $$
declare t text;
begin
  foreach t in array array['ai_conversations','ai_memory'] loop
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
