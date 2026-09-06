/**
 * Model (Dexie, camelCase, nested `sync: SyncMeta`)  <->  Row (Postgres,
 * snake_case, flat `user_id / created_at / updated_at / deleted_at / version`).
 *
 * Only TOP-LEVEL keys are converted. jsonb column values (recurrence, reminders,
 * target, participants, items, metrics, …) are stored verbatim so their inner
 * camelCase keys survive a round-trip.
 */

import type { SyncMeta } from "@/lib/types";

export type Row = Record<string, unknown>;
export type Model = Record<string, unknown> & { id: string; sync: SyncMeta };

const SNAKE_RE = /[A-Z]/g;
const CAMEL_RE = /_([a-z0-9])/g;

export function camelToSnake(key: string): string {
  return key.replace(SNAKE_RE, (m) => `_${m.toLowerCase()}`);
}

export function snakeToCamel(key: string): string {
  return key.replace(CAMEL_RE, (_, c: string) => c.toUpperCase());
}

/** Keys that live flat on a Row but nested under `sync` on a Model. */
const ROW_SYNC_KEYS = ["created_at", "updated_at", "deleted_at", "version"] as const;

/**
 * Model -> Row. `userId` is stamped on. `sync.syncStatus` / `sync.remoteId`
 * are client-only and dropped. `version` is included for optimistic concurrency
 * but the DB trigger is authoritative on writes.
 */
export function modelToRow(model: Model, userId: string): Row {
  const row: Row = { user_id: userId };
  for (const [k, v] of Object.entries(model)) {
    if (k === "sync") continue;
    row[camelToSnake(k)] = v;
  }
  const s = model.sync;
  row.created_at = s.createdAt;
  row.updated_at = s.updatedAt;
  row.deleted_at = s.deletedAt ?? null;
  row.version = s.version;
  return row;
}

/** Row -> Model. The row is treated as canonical (syncStatus = "synced"). */
export function rowToModel(row: Row): Model {
  const model: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (k === "user_id") continue;
    if ((ROW_SYNC_KEYS as readonly string[]).includes(k)) continue;
    model[snakeToCamel(k)] = v;
  }
  const sync: SyncMeta = {
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
    deletedAt: (row.deleted_at as string | null) ?? null,
    syncStatus: "synced",
    remoteId: String(row.id),
    version: Number(row.version ?? 1),
  };
  return { ...(model as { id: string }), sync } as Model;
}
