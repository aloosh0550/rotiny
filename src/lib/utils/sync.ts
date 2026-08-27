import type { SyncMeta } from "@/lib/types";

export function createSyncMeta(now: string = new Date().toISOString()): SyncMeta {
  return {
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    syncStatus: "pending",
    remoteId: null,
    version: 1,
  };
}

export function touchSyncMeta(meta: SyncMeta, now: string = new Date().toISOString()): SyncMeta {
  return {
    ...meta,
    updatedAt: now,
    syncStatus: "pending",
    version: meta.version + 1,
  };
}
