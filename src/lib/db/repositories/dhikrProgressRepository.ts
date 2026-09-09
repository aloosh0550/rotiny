import { db } from "@/lib/db/schema";
import type { DhikrProgress, ID } from "@/lib/types";
import { generateId } from "@/lib/utils/id";
import { createSyncMeta, touchSyncMeta } from "@/lib/utils/sync";
import { makeSyncedRepository } from "./helpers";

const base = makeSyncedRepository<DhikrProgress>(db.dhikrProgress, "dhikrProgress");

export const dhikrProgressRepository = {
  ...base,
  async getForDate(date: string): Promise<DhikrProgress[]> {
    const all = await base.getAll();
    return all.filter((p) => p.date === date);
  },
  async getForDhikrOnDate(dhikrId: ID, date: string): Promise<DhikrProgress | undefined> {
    const all = await base.getAll();
    return all.find((p) => p.dhikrId === dhikrId && p.date === date);
  },
  async increment(dhikrId: ID, date: string, targetCount: number): Promise<DhikrProgress> {
    const existing = await this.getForDhikrOnDate(dhikrId, date);
    const now = new Date().toISOString();
    if (!existing) {
      const created: DhikrProgress = {
        id: generateId(),
        dhikrId,
        date,
        count: 1,
        completedAt: targetCount <= 1 ? now : null,
        sync: createSyncMeta(now),
      };
      return base.create(created);
    }
    const nextCount = existing.count + 1;
    const updated: DhikrProgress = {
      ...existing,
      count: nextCount,
      completedAt: nextCount >= targetCount ? (existing.completedAt ?? now) : null,
      sync: touchSyncMeta(existing.sync, now),
    };
    await db.dhikrProgress.put(updated);
    return updated;
  },
  async resetForDate(dhikrId: ID, date: string): Promise<void> {
    const existing = await this.getForDhikrOnDate(dhikrId, date);
    if (existing) await base.hardDelete(existing.id);
  },
};
