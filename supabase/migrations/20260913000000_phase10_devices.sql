-- ============================================================================
-- Routini — 0009_phase10_devices  (additive)
--
-- devices — one row per (user, physical device). Powers:
--   • multi-device presence ("last seen on …")
--   • push delivery: `push_token` + `push_provider` are the address an Edge
--     Function uses to send a notification. Both nullable — a device without a
--     token (push off / not configured) is still a valid presence row.
--
-- Per-user + RLS + set_updated_at trigger (has `version`) + realtime.
-- No existing table or row is touched. Push itself needs a Firebase project and
-- an `fcm-send` Edge Function — see supabase/functions/push-send/README.md.
-- ============================================================================

create table if not exists public.devices (
  id             text primary key,
  user_id        uuid not null references auth.users (id) on delete cascade,
  kind           text not null default 'web' check (kind in ('phone','tablet','web','watch','other')),
  name           text not null default '',
  platform       text not null default 'web' check (platform in ('web','android','ios','other')),
  push_token     text,
  push_provider  text not null default 'none' check (push_provider in ('none','fcm','webpush')),
  last_seen_at   timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz,
  version        integer not null default 1
);
create index if not exists devices_user_idx on public.devices (user_id, last_seen_at desc);

do $$
declare t text;
begin
  foreach t in array array['devices'] loop
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
