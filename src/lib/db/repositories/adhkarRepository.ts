import { db } from "@/lib/db/schema";
import type { Dhikr, ID } from "@/lib/types";
import { makeSyncedRepository } from "./helpers";

const base = makeSyncedRepository<Dhikr>(db.adhkar);

export const adhkarRepository = {
  ...base,
  async getForCategory(categoryId: ID): Promise<Dhikr[]> {
    const all = await base.getAll();
    return all.filter((d) => d.categoryId === categoryId).sort((a, b) => a.order - b.order);
  },
};
