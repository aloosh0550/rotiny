import type { Table } from "dexie";
import type { ID, SyncMeta } from "@/lib/types";
import { touchSyncMeta } from "@/lib/utils/sync";

export type SyncedEntity = { id: ID; sync: SyncMeta };

export function makeSyncedRepository<T extends SyncedEntity>(table: Table<T, string>) {
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
      return item;
    },
    async update(id: ID, patch: Partial<T>): Promise<T> {
      const existing = await table.get(id);
      if (!existing) throw new Error(`Not found: ${id}`);
      const updated: T = { ...existing, ...patch, sync: touchSyncMeta(existing.sync) };
      await table.put(updated);
      return updated;
    },
    async delete(id: ID): Promise<void> {
      const existing = await table.get(id);
      if (!existing) return;
      const now = new Date().toISOString();
      await table.put({
        ...existing,
        sync: { ...existing.sync, deletedAt: now, updatedAt: now, syncStatus: "pending", version: existing.sync.version + 1 },
      });
    },
    async hardDelete(id: ID): Promise<void> {
      await table.delete(id);
    },
    async query(predicate: (item: T) => boolean): Promise<T[]> {
      const all = await table.toArray();
      return all.filter((item) => !item.sync.deletedAt).filter(predicate);
    },
  };
}
