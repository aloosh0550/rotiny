import { db } from "@/lib/db/schema";
import type { Habit } from "@/lib/types";
import { makeSyncedRepository } from "./helpers";

const base = makeSyncedRepository<Habit>(db.habits, "habits");

export const habitsRepository = {
  ...base,
  async getActive(): Promise<Habit[]> {
    const all = await base.getAll();
    return all.filter((h) => !h.archivedAt);
  },
};
