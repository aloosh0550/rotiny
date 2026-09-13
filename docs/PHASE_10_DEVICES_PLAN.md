# `devices` — implementation plan (code not yet written)

Verified during the Phase 15+ closure audit (2026-09-13): the
`20260913000000_phase10_devices.sql` migration exists and is additive/safe, but
**zero client code depends on it** — no `devicesRepository`, no device
registration, no multi-device-presence UI anywhere in `src/`. Applying the
migration alone would create an empty, unused table on Production; that's not
useful on its own; hence this plan instead of a pointless migration run.

Do this work **before** asking for the migration to be applied, then apply the
migration and merge in one step (see the empirically-proven realtime caveat in
§4 — it changes the merge order).

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

## 3. Repository (`src/lib/db/repositories/devicesRepository.ts`)

```ts
const base = makeSyncedRepository<Device>(db.devices, "devices");
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
