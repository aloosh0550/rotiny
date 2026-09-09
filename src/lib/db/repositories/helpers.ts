import type { Table } from "dexie";
import type { ID, SyncMeta } from "@/lib/types";
import { touchSyncMeta } from "@/lib/utils/sync";
import { isSupabaseConfigured } from "@/lib/config/env";
import { db } from "@/lib/db/schema";
import { generateId } from "@/lib/utils/id";

export type SyncedEntity = { id: ID; sync: SyncMeta };

/**
 * Records a pending cloud operation in the local outbox (`syncQueue`). The
 * SyncEngine drains it. No-op when Supabase isn't configured — local-only
 * installs keep an empty queue.
 */
async function enqueue(
  entityType: string,
  entityId: string,
  operation: "create" | "update" | "delete",
  payload: unknown,
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    await db.syncQueue.add({
      id: generateId(),
      entityType: entityType as never,
      entityId,
      operation,
      payload,
      createdAt: new Date().toISOString(),
      attempts: 0,
    });
  } catch {
    /* outbox is best-effort; a failed enqueue is retried by a later mutation / pull */
  }
}

/**
 * @param table       the Dexie table
 * @param entityType  the sync tag (Dexie table name, e.g. "tasks"); when set,
 *                     every create/update/delete is mirrored into the outbox.
 */
export function makeSyncedRepository<T extends SyncedEntity>(
  table: Table<T, string>,
  entityType?: string,
) {
  return {
    async getAll(): Promise<T[]> {
      const all = await table.toArray();
      return all.filter((item) => !item.sync.deletedAt);
    },
    async getById(id: ID): Promise<T | undefined> {
      const item = await table.get(id);
      return item && !item.sync.deletedAt ? item : undefined;
    },
    async create(item: T): Promise<T> {
      await table.add(item);
      if (entityType) await enqueue(entityType, item.id, "create", item);
      return item;
    },
    async update(id: ID, patch: Partial<T>): Promise<T> {
      const existing = await table.get(id);
      if (!existing) throw new Error(`Not found: ${id}`);
      const updated: T = { ...existing, ...patch, sync: touchSyncMeta(existing.sync) };
      await table.put(updated);
      if (entityType) await enqueue(entityType, id, "update", updated);
      return updated;
    },
    async delete(id: ID): Promise<void> {
      const existing = await table.get(id);
      if (!existing) return;
      const now = new Date().toISOString();
      await table.put({
        ...existing,
        sync: {
          ...existing.sync,
          deletedAt: now,
          updatedAt: now,
          syncStatus: "pending",
          version: existing.sync.version + 1,
        },
      });
      if (entityType) await enqueue(entityType, id, "delete", null);
    },
    async hardDelete(id: ID): Promise<void> {
      await table.delete(id);
      if (entityType) await enqueue(entityType, id, "delete", null);
    },
    async query(predicate: (item: T) => boolean): Promise<T[]> {
      const all = await table.toArray();
      return all.filter((item) => !item.sync.deletedAt).filter(predicate);
    },
  };
}
