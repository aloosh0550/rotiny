import { db } from "@/lib/db/schema";
import type { SyncQueueEntry } from "@/lib/types";
import { generateId } from "@/lib/utils/id";

export const syncQueueRepository = {
  async enqueue(entry: Omit<SyncQueueEntry, "id" | "createdAt" | "attempts">): Promise<void> {
    await db.syncQueue.add({
      ...entry,
      id: generateId(),
      createdAt: new Date().toISOString(),
      attempts: 0,
    });
  },
  async getAll(): Promise<SyncQueueEntry[]> {
    return db.syncQueue.orderBy("createdAt").toArray();
  },
  async count(): Promise<number> {
    return db.syncQueue.count();
  },
  async clear(): Promise<void> {
    await db.syncQueue.clear();
  },
  async remove(id: string): Promise<void> {
    await db.syncQueue.delete(id);
  },
};
