import { db } from "@/lib/db/schema";
import type { HabitCompletion, ID } from "@/lib/types";
import { generateId } from "@/lib/utils/id";
import { createSyncMeta } from "@/lib/utils/sync";
import { makeSyncedRepository } from "./helpers";

const base = makeSyncedRepository<HabitCompletion>(db.habitCompletions);

export const habitCompletionsRepository = {
  ...base,
  async getForHabit(habitId: ID): Promise<HabitCompletion[]> {
    const all = await base.getAll();
    return all.filter((c) => c.habitId === habitId).sort((a, b) => a.date.localeCompare(b.date));
  },
  async getForDate(date: string): Promise<HabitCompletion[]> {
    const all = await base.getAll();
    return all.filter((c) => c.date === date);
  },
  async isCompletedOn(habitId: ID, date: string): Promise<HabitCompletion | undefined> {
    const all = await base.getAll();
    return all.find((c) => c.habitId === habitId && c.date === date);
  },
  async toggleForDate(habitId: ID, date: string, value?: number | null): Promise<void> {
    const existing = await this.isCompletedOn(habitId, date);
    if (existing) {
      await base.hardDelete(existing.id);
      return;
    }
    const now = new Date().toISOString();
    await base.create({
      id: generateId(),
      habitId,
      date,
      completedAt: now,
      value: value ?? null,
      sync: createSyncMeta(now),
    });
  },
};
