import { db } from "@/lib/db/schema";
import type { Device } from "@/lib/types";
import { createSyncMeta } from "@/lib/utils/sync";
import { nativePlatform } from "@/lib/native/platform";
import { makeSyncedRepository } from "./helpers";

const DEVICE_ID_KEY = "routini:deviceId";

// Local-only for now: no `entityType` is passed to makeSyncedRepository, so a
// mutation never enqueues to the outbox — the server `devices` table exists
// but isn't applied on Production yet (see docs/PHASE_10_DEVICES_PLAN.md).
// Passing an entityType here before `SYNCED_TABLES`/`DEXIE_TABLE` know about
// "devices" would make SyncEngine.flushEntry silently drop every queued
// mutation (PG_TABLE[entityType] resolves to undefined -> the entry is
// discarded without ever reaching the server).
const base = makeSyncedRepository<Device>(db.devices);

function deviceName(platform: Device["platform"]): string {
  if (platform === "android") return "هاتف Android";
  if (platform === "ios") return "هاتف iOS";
  return "متصفح ويب";
}

function deviceIdForThisInstall(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
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
   * app start / sign-in — idempotent by the per-install id stored in
   * localStorage. Purely local until the `devices` migration is applied.
   */
  async registerThisDevice(): Promise<Device> {
    const id = deviceIdForThisInstall();
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

  /** This install's row, or undefined before the first `registerThisDevice()`. */
  async getThisDevice(): Promise<Device | undefined> {
    try {
      const id = localStorage.getItem(DEVICE_ID_KEY);
      if (!id) return undefined;
      return base.getById(id);
    } catch {
      return undefined;
    }
  },
};
