import { db } from "@/lib/db/schema";
import type { Device } from "@/lib/types";
import { createSyncMeta } from "@/lib/utils/sync";
import { nativePlatform } from "@/lib/native/platform";
import { makeSyncedRepository } from "./helpers";

// Local-only fallback (no signed-in user yet). Once a user is known, the id
// is scoped PER ACCOUNT (`${DEVICE_ID_KEY}:${userId}`) — deliberately NOT a
// single global id reused across accounts. `devices.id` is the server's
// primary key with no per-user namespacing, so if the same physical device
// registered under account A then reused A's exact id while signed in as B,
// the upsert would try to rewrite a row RLS says B can't see/match ("owner
// all": `using (user_id = auth.uid())`), which either fails outright or —
// worse — could only be reached by relaxing that policy. Scoping the id by
// account instead means two different accounts on the same physical device
// always get two distinct, independently-owned rows; each account's
// sign-in→sign-in span still reuses its own stable id (idempotent, no
// duplicate rows for the same account).
const DEVICE_ID_KEY = "routini:deviceId";
const deviceIdKeyFor = (userId?: string) => (userId ? `${DEVICE_ID_KEY}:${userId}` : DEVICE_ID_KEY);

// Cloud-synced (entityType "devices" — matches DEXIE_TABLE.devices, so
// PG_TABLE["devices"] resolves and SyncEngine.flushEntry can push it). The
// server `devices` table exists (`20260913000000_phase10_devices.sql`,
// verified compatible against a real local Supabase run — RLS, columns,
// trigger, realtime) but is NOT yet applied on Production (confirmed absent
// via a read-only check). Until it is: `CloudStore.pull/getOne` and the
// `subscribe()` per-table probe already degrade gracefully for the missing
// table, and `SyncEngine.flush()` now isolates a persistently-failing entry
// so a stuck `devices` push can never block any other entity's sync (see
// docs/PHASE_10_DEVICES_PLAN.md). A queued `devices` mutation will simply sit
// retrying, harmlessly, until the migration is applied.
const base = makeSyncedRepository<Device>(db.devices, "devices");

function deviceName(platform: Device["platform"]): string {
  if (platform === "android") return "هاتف Android";
  if (platform === "ios") return "هاتف iOS";
  return "متصفح ويب";
}

function deviceIdForThisInstall(userId?: string): string {
  const key = deviceIdKeyFor(userId);
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(key, id);
    return id;
  } catch {
    // storage unavailable (private mode / SSR) — a stable per-call id is the
    // best we can do; this device just won't be recognized across reloads.
    return crypto.randomUUID();
  }
}

export const devicesRepository = {
  ...base,

  /**
   * Upsert this install's row and bump `lastSeenAt`. Safe to call on every
   * app start / sign-in — idempotent per (install, account) pair, so this
   * never creates a duplicate row for the same physical device signed into
   * the same account. Pass the signed-in user's id when known (from
   * `SyncEngine.start()` or the settings page) so the id is account-scoped;
   * omit it only for the fully signed-out / local-only case. The push itself
   * will keep failing gracefully (see above) until the `devices` migration is
   * applied on Production.
   */
  async registerThisDevice(userId?: string): Promise<Device> {
    const id = deviceIdForThisInstall(userId);
    const platform = nativePlatform();
    const now = new Date().toISOString();
    const existing = await base.getById(id);
    if (existing) {
      return base.update(id, { lastSeenAt: now });
    }
    const device: Device = {
      id,
      kind: platform === "web" ? "web" : "phone",
      name: deviceName(platform),
      platform,
      pushToken: null,
      pushProvider: "none",
      lastSeenAt: now,
      sync: createSyncMeta(now),
    };
    return base.create(device);
  },

  /** This install's row for `userId` (or the local-only row when omitted), or undefined before the first `registerThisDevice()`. */
  async getThisDevice(userId?: string): Promise<Device | undefined> {
    try {
      const id = localStorage.getItem(deviceIdKeyFor(userId));
      if (!id) return undefined;
      return base.getById(id);
    } catch {
      return undefined;
    }
  },
};
