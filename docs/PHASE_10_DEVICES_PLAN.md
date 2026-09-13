# `devices` — implementation plan

**Update (2026-09-13, same-day follow-up): §1–3 below are now implemented and
unit-tested locally** (`Device`/`DeviceKind`/`DevicePlatform`/`PushProvider` in
`models.ts`, Dexie v9 `devices` store, `devicesRepository.registerThisDevice()`
called from `SyncEngine.start()` and from `/more/settings/sync`, +7 tests).

**Update (2026-09-13, second same-day follow-up): §4 is now done except its
last, deliberate gate.** `devices` was added to `SYNCED_TABLES`/`DEXIE_TABLE`;
`CloudStore.subscribe()` was hardened to probe each table before binding it
to the shared realtime channel, so a missing `devices` table can no longer
break sync for anything else. `devicesRepository` still calls
`makeSyncedRepository` with **no `entityType`**, so a mutation never enqueues
— that single line is the only change left once the migration is approved and
applied. Confirmed via a read-only PostgREST probe (2026-09-13, no PAT) that
`devices` is still absent on Production (`404 PGRST205`) — this migration was
not run.

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

## 3. Repository (`src/lib/db/repositories/devicesRepository.ts`) — **implemented**

The shipped version (see the file itself) follows this sketch with one
deliberate change: `makeSyncedRepository<Device>(db.devices)` is called with
**no `entityType`** — passing `"devices"` today would enqueue mutations that
`SyncEngine.flushEntry` can't resolve (`PG_TABLE["devices"]` is `undefined`
until §4 runs), silently dropping them from the outbox. `registerThisDevice()`
also exposes a paired `getThisDevice()` for the settings UI (§3b).

```ts
const base = makeSyncedRepository<Device>(db.devices); // no entityType yet — see above
export const devicesRepository = {
  ...base,
  async registerThisDevice(): Promise<Device> {
    const id = localStorage.getItem("routini:deviceId") ?? crypto.randomUUID();
    localStorage.setItem("routini:deviceId", id);
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

## 4. Cloud wiring — **done except the one write-path gate**

**Update (2026-09-13, second same-day follow-up):** this section originally
said to add `"devices"` to `SYNCED_TABLES` only in the same deploy as the
Production migration, because of the realtime risk below. That risk has since
been **fixed at the root** instead of worked around by timing:
`CloudStore.subscribe()` now probes every `SYNCED_TABLES` entry with a cheap
1-row select before opening the shared realtime channel, and skips the
`postgres_changes` binding for any table that isn't on the server yet. So:

- `"devices"` **is now in `SYNCED_TABLES`/`DEXIE_TABLE`** — safe today, because
  `pullAll()` already degrades gracefully for a missing table, and `subscribe()`
  now does too (see above). Neither can break sync for any other entity.
- The **only** thing still deliberately withheld is the *write* path:
  `devicesRepository` calls `makeSyncedRepository<Device>(db.devices)` with
  **no `entityType`**, so a local mutation never enqueues to the outbox. This
  is the one real remaining risk if flipped early: `SyncEngine.flush()`'s
  per-entry loop `break`s (stops processing the rest of the queue) on the
  first entry whose push throws, and `CloudStore.push` intentionally throws
  for a missing table (so the mutation isn't silently lost) — so an enqueued
  `devices` mutation would repeatedly stall *every other entity's* pending
  sync too, on every 20s flush tick, until the migration lands. This is
  contained today only because `redesign/routini-v2` isn't merged into `main`.

> **Original finding (still true, now mitigated by the probe-and-skip fix
> above rather than by deploy timing)**: a Supabase Realtime channel with a
> `postgres_changes` binding to a table that does not yet exist silently
> stops delivering events for every other table bound in the same channel —
> the channel still reports `SUBSCRIBED` (no visible error), but real-time
> sync goes quiet for everything (tasks, habits, appointments, …) for every
> signed-in user.

**Verified, not just reasoned about**: a new integration test
(`tests/integration/sync.integration.test.ts`) calls `CloudStore.push/getOne`
directly for `"devices"` against a local Supabase stack with this exact
migration applied, and confirms the row round-trips with the correct columns
and that RLS isolates/rejects a forged cross-user row — proving the migration
itself is compatible with the client, independent of the deliberate
repository-level write gate.

Sequence once you're ready:
1. Apply `20260913000000_phase10_devices.sql` (you run it; I don't apply it unprompted).
2. In the same PR: add `entityType: "devices"` to `devicesRepository`'s
   `makeSyncedRepository` call (the only remaining code change), merge
   `redesign/routini-v2` → `main` (which deploys) right after confirming the
   migration succeeded.

## 5. What this unlocks (and what it doesn't)

- Unlocks: a `devices` row per install, "last seen" presence, and the address
  book (`push_token`) that J4 (FCM) will write into once Firebase is set up.
- Does **not** by itself implement push notifications, multi-device *conflict*
  UI, or anything native. Those remain governed by `PHASE_10_REMAINING.md`.

## 6. Estimated risk

**Low.** Purely additive (new table, new Dexie store, new repository, one new
call site in `SyncEngine.start()`). No existing table, column, or behavior
changes. Same shape as the `ai_conversations`/`ai_memory`/`reviews` rollouts
that are already live and stable on Production. The migration itself has been
verified compatible end-to-end against a real local Supabase instance (§4).
The only residual risk is procedural, not technical: flipping
`devicesRepository`'s `entityType` on **before** the migration is applied would
make every `devices` mutation stall the entire sync outbox (see §4) — avoided
simply by doing that one-line change only after the migration is confirmed
live, exactly as `ai_actions` was staged.
