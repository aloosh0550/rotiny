# `devices` — implementation plan

**Status as of 2026-09-13 (third same-day follow-up): code-complete,
locally tested end-to-end against the real migration — held only on the
Production migration itself + explicit approval to merge `redesign/routini-v2`
→ `main`.** §1 through §4 are all done. Nothing here claims Production cloud
sync is active — it isn't, and won't be, until the migration below is applied.

- **§1–3 (2026-09-13, first follow-up)**: `Device`/`DeviceKind`/`DevicePlatform`/
  `PushProvider` types, Dexie v9 `devices` store, `devicesRepository` +
  `registerThisDevice()`/`getThisDevice()`, wired into `SyncEngine.start()` and
  `/more/settings/sync`.
- **§4 read/realtime path (2026-09-13, second follow-up)**: `devices` added to
  `SYNCED_TABLES`/`DEXIE_TABLE`; `CloudStore.subscribe()` hardened to probe
  each table before binding it to the shared realtime channel, so a missing
  table can never break sync for anything else.
- **§4 write path (2026-09-13, third follow-up — this update)**:
  `devicesRepository` now passes `entityType: "devices"`, so a local mutation
  enqueues and pushes exactly like every other entity. This surfaced and fixed
  two real gaps (details in §4):
  1. `SyncEngine.flush()` used to `break` its whole outbox loop on the first
     entry that threw — fixed to `continue`, so a persistently-failing
     `devices` push (expected until the migration lands) can never stall any
     other entity's pending sync.
  2. The local device id was a single global value reused across every
     account on the same physical device — fixed to be scoped per
     `(install, account)` pair, so two different accounts signing into the
     same device never fight over the same server-side row.
- Confirmed via a read-only PostgREST probe (2026-09-13, no PAT): `devices` is
  still absent on Production (`404 PGRST205`) — this migration was not run in
  any of the three follow-ups.

---

Originally written during the Phase 15+ closure audit (2026-09-13): the
`20260913000000_phase10_devices.sql` migration exists and is additive/safe, but
at the time **zero client code depended on it** — no `devicesRepository`, no
device registration, no multi-device-presence UI anywhere in `src/`. Applying
the migration alone would have created an empty, unused table on Production;
that's not useful on its own; hence this plan instead of a pointless migration
run.

§1–3 (local code) are now done. §4 (cloud wiring) still applies exactly as
written: do it **only after** the migration is applied, in the same step (see
the empirically-proven realtime caveat below — it changes the merge order).

## 1. Types (`src/lib/types/models.ts`)

```ts
export type DeviceKind = "phone" | "tablet" | "web" | "watch" | "other";
export type DevicePlatform = "web" | "android" | "ios" | "other";
export type PushProvider = "none" | "fcm" | "webpush";

export interface Device {
  id: ID; // a per-install uuid, generated once and kept in localStorage
  kind: DeviceKind;
  name: string;
  platform: DevicePlatform;
  pushToken?: string | null;
  pushProvider: PushProvider;
  lastSeenAt: string;
  sync: SyncMeta;
}
```
Add `"device"` to `EntityType` (shared.ts), `deviceSchema` to `schemas.ts` +
backup wiring (same pattern as every other Phase 7–11 entity).

## 2. Dexie (`src/lib/db/schema.ts`)

`version(9).stores({ devices: "id, sync.deletedAt" })` — additive, new store only.

## 3. Repository (`src/lib/db/repositories/devicesRepository.ts`) — **implemented, write path enabled**

`makeSyncedRepository<Device>(db.devices, "devices")` — cloud-synced. The
local device id is **account-scoped**, not the single global value in the
original sketch below: `registerThisDevice(userId?)` reads/writes
`routini:deviceId:${userId}` when a user is known (from `SyncEngine.start()`
or the settings page), falling back to the old global `routini:deviceId` only
when fully signed out. This is a deliberate change from the original plan —
see §4 for why a bare global id was unsafe. `registerThisDevice()` also
exposes a paired `getThisDevice(userId?)` for the settings UI (§3b).

```ts
// simplified — see the file itself for the account-scoped id logic
const base = makeSyncedRepository<Device>(db.devices, "devices");
export const devicesRepository = {
  ...base,
  async registerThisDevice(userId?: string): Promise<Device> {
    const key = userId ? `routini:deviceId:${userId}` : "routini:deviceId";
    const id = localStorage.getItem(key) ?? crypto.randomUUID();
    localStorage.setItem(key, id);
    const existing = await base.getById(id);
    const patch = {
      kind: isNativePlatform() ? "phone" : "web",
      platform: isNativePlatform() ? "android" : "web",
      lastSeenAt: new Date().toISOString(),
    };
    return existing ? base.update(id, patch) : base.create({ id, ...patch, pushProvider: "none", sync: createSyncMeta() });
  },
};
```

## 3b. Settings UI — **implemented**

`/more/settings/sync` now shows a "هذا الجهاز" card (name + last-seen + an
explicit "not synced yet" line), backed by `registerThisDevice()` called once
on mount. Purely informational today — there's no cross-device list yet since
nothing is synced to the cloud.

`registerThisDevice()` is called once from `SyncEngine.start()` (fire-and-forget,
`.catch(() => {})`) — mirrors how `lifeAreasRepository.ensureDefaults()` is
already called there.

## 4. Cloud wiring — **fully implemented, held on the migration + merge approval**

This section originally staged the rollout in two steps timed around the
Production migration, because of the realtime risk below. That risk was
**fixed at the root** instead of worked around by timing — see the finding
box — which made it safe to finish the write path too, ahead of the
migration, the same session:

- **Read + realtime**: `"devices"` is in `SYNCED_TABLES`/`DEXIE_TABLE`.
  `pullAll()` degrades gracefully for a missing table (existing
  `isMissingTable` logic). `CloudStore.subscribe()` probes every table with a
  cheap 1-row select before opening the shared realtime channel and skips the
  `postgres_changes` binding for any table not yet on the server — so a
  missing `devices` table can never break realtime for any other entity.
- **Write**: `devicesRepository` now passes `entityType: "devices"` to
  `makeSyncedRepository`, so `registerThisDevice()` enqueues and pushes like
  any other entity. Doing this safely *before* the migration required two
  fixes, both verified:
  1. **`SyncEngine.flush()` per-entry isolation.** It used to `break` its
     whole outbox loop on the first entry whose push threw — and
     `CloudStore.push` intentionally throws for a missing table rather than
     silently dropping the mutation, so an enqueued `devices` mutation would
     have stalled *every other entity's* pending sync too, every 20s tick,
     until the migration lands. Changed to `continue`: each failing entry is
     retried on its own; healthy entities keep flushing normally. Proven with
     a unit test (`tests/sync/flushIsolation.test.ts`) using a mocked
     `CloudStore` where `devices` always throws and `tasks` always succeeds —
     the task's queue entry is still removed after `flush()`, the device's
     stays queued.
  2. **Account-scoped device id.** `devices.id` is a bare Postgres primary
     key, not namespaced per user — but the local id used to be a single
     global `localStorage` value reused across every account on the same
     physical device. If account A's device row already existed server-side
     and account B (same device) reused the exact same id, the upsert would
     collide with RLS (`user_id = auth.uid()` can't see/match A's row while
     signed in as B). Fixed: the persisted id is now scoped to
     `routini:deviceId:${userId}` (falling back to the old global key only
     when fully signed out) — two accounts on the same device always get two
     independently-owned rows; the same account signing in repeatedly still
     reuses its own id (no duplicate rows).

> **Realtime finding (still true, mitigated at the root by the probe-and-skip
> fix, not by deploy timing)**: a Supabase Realtime channel with a
> `postgres_changes` binding to a table that does not yet exist silently
> stops delivering events for every other table bound in the same channel —
> the channel still reports `SUBSCRIBED` (no visible error), but real-time
> sync goes quiet for everything (tasks, habits, appointments, …) for every
> signed-in user.

**Verified live, not just reasoned about**, against a local Supabase stack
running this exact migration: create → push → pull → `lastSeenAt` update →
sign-out wipe → RLS isolation → forged-insert rejection, all through
`devicesRepository` itself (not a bypass) — plus the account-guard test
extended to seed a leftover device row for account A and confirm it's wiped
locally, never reaches B's cloud, and B still gets its own working device row
afterward.

**The only thing left is the migration itself + the merge**:
1. Apply `20260913000000_phase10_devices.sql` on Production (owner runs it;
   the agent does not apply it unprompted).
2. Merge `redesign/routini-v2` → `main` (which auto-deploys) right after
   confirming the migration succeeded — **no further code change is needed**,
   unlike the original two-step plan.

## 5. What this unlocks (and what it doesn't)

- Unlocks: a `devices` row per install, "last seen" presence, and the address
  book (`push_token`) that J4 (FCM) will write into once Firebase is set up.
- Does **not** by itself implement push notifications, multi-device *conflict*
  UI, or anything native. Those remain governed by `PHASE_10_REMAINING.md`.

## 6. Estimated risk

**Low, and now verified rather than just reasoned about.** Purely additive
(new table, new Dexie store, new repository, one new call site in
`SyncEngine.start()`). No existing table, column, or behavior changes. Same
shape as the `ai_conversations`/`ai_memory`/`reviews` rollouts that are
already live and stable on Production. The migration itself round-trips
correctly end-to-end against a real local Supabase instance (§4), including
RLS ownership, forged-insert rejection, and cross-account isolation.

What used to be residual risk is now fixed in code, not just avoided by
timing: `SyncEngine.flush()` no longer lets one persistently-failing entity
block every other entity's sync, and the device id is account-scoped so two
accounts on the same physical device can never collide on the same
server-side row. The only thing genuinely still pending is the migration
itself (owner-run) and the merge to `main` (owner-approved) — no code change
is queued behind either.
