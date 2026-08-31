import { db, DEFAULT_TASK_CATEGORIES } from "@/lib/db/schema";
import type { TaskCategory } from "@/lib/types";
import { generateId } from "@/lib/utils/id";
import { createSyncMeta } from "@/lib/utils/sync";
import { makeSyncedRepository } from "./helpers";

const base = makeSyncedRepository<TaskCategory>(db.taskCategories);

export const taskCategoriesRepository = {
  ...base,
  async getAllSorted(): Promise<TaskCategory[]> {
    const all = await base.getAll();
    return all.sort((a, b) => a.order - b.order);
  },
  /** Fresh-install fallback (the v2 upgrade covers users who already had data). */
  async ensureDefaults(): Promise<void> {
    const count = await db.taskCategories.count();
    if (count > 0) return;
    const now = new Date().toISOString();
    await db.taskCategories.bulkAdd(
      DEFAULT_TASK_CATEGORIES.map((c, i) => ({
        id: generateId(),
        name: c.name,
        color: c.color,
        order: i,
        sync: createSyncMeta(now),
      })),
    );
  },
};
