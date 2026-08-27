import { db } from "@/lib/db/schema";
import type { DhikrCategory } from "@/lib/types";
import { makeSyncedRepository } from "./helpers";

const base = makeSyncedRepository<DhikrCategory>(db.dhikrCategories);

export const dhikrCategoriesRepository = {
  ...base,
  async getAllSorted(): Promise<DhikrCategory[]> {
    const all = await base.getAll();
    return all.sort((a, b) => a.order - b.order);
  },
};
