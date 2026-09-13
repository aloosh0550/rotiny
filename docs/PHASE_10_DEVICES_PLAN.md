# `devices` — implementation plan

**Update (2026-09-13, same-day follow-up): §1–3 below are now implemented and
unit-tested locally** (`Device`/`DeviceKind`/`DevicePlatform`/`PushProvider` in
`models.ts`, Dexie v9 `devices` store, `devicesRepository.registerThisDevice()`
called from `SyncEngine.start()` and from `/more/settings/sync`, +7 tests).
**§4 (cloud wiring) is deliberately NOT done** — `devices` is still local-only
(`makeSyncedRepository(db.devices)` with no `entityType`, so nothing enqueues)
and stays out of `SYNCED_TABLES` until the migration below is applied. Confirmed
via a read-only PostgREST probe (2026-09-13, no PAT) that `devices` is still
absent on Production (`404 PGRST205`).

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

`/more/settings/sync` now shows a "هذا الجهاز" card (name + last-seen), backed
by `registerThisDevice()` called once on mount. Purely informational today —
there's no cross-device list yet since nothing is synced to the cloud.
```
`registerThisDevice()` is called once from `SyncEngine.start()` (fire-and-forget,
`.catch(() => {})`) — mirrors how `lifeAreasRepository.ensureDefaults()` is
already called there.

## 4. Cloud wiring — **apply the migration in the SAME step as this code**

Add `"devices"` to `SYNCED_TABLES` / `DEXIE_TABLE` in `src/lib/data/tables.ts`
**only in the same commit/deploy that follows the Production migration being
applied** — not before. This is not a style preference; it's proven necessary:

> **Empirically verified this session**: a Supabase Realtime channel with a
> `postgres_changes` binding to a table that does not yet exist **silently stops
> delivering events for every other table bound in the same channel** — the
> channel still reports `SUBSCRIBED` (no visible error), but real-time sync goes
> quiet for everything (tasks, habits, appointments, …) for every signed-in user.
> `cloudStore.pull/getOne` were hardened this session to degrade gracefully for a
> missing table (see `CloudStore.ts` `isMissingTable`), which protects the
> pull/outbox path — but the realtime subscribe loop has no such protection and
> the finding above shows it can't be worked around cheaply. So: **`devices`
> must not enter `SYNCED_TABLES` until its migration is live on Production.**

Sequence once you're ready:
1. Apply `20260913000000_phase10_devices.sql` (you run it; I don't apply it unprompted).
2. In the same PR: add `"devices"` to `SYNCED_TABLES`/`DEXIE_TABLE`, wire
   `registerThisDevice()` into `SyncEngine.start()`, merge `redesign/routini-v2`
   → `main` (which deploys) right after confirming the migration succeeded.

## 5. What this unlocks (and what it doesn't)

- Unlocks: a `devices` row per install, "last seen" presence, and the address
  book (`push_token`) that J4 (FCM) will write into once Firebase is set up.
- Does **not** by itself implement push notifications, multi-device *conflict*
  UI, or anything native. Those remain governed by `PHASE_10_REMAINING.md`.

## 6. Estimated risk

**Low.** Purely additive (new table, new Dexie store, new repository, one new
call site in `SyncEngine.start()`). No existing table, column, or behavior
changes. Same shape as the `ai_conversations`/`ai_memory`/`reviews` rollouts
that are already live and stable on Production.
