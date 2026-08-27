import { db } from "@/lib/db/schema";
import type { Task, TaskStatus } from "@/lib/types";
import { makeSyncedRepository } from "./helpers";

const base = makeSyncedRepository<Task>(db.tasks);

export const tasksRepository = {
  ...base,
  async getByStatus(status: TaskStatus): Promise<Task[]> {
    const all = await base.getAll();
    return all.filter((t) => t.status === status);
  },
  async getOverdue(nowIso: string): Promise<Task[]> {
    const all = await base.getAll();
    return all.filter((t) => t.status === "pending" && t.dueAt != null && t.dueAt < nowIso);
  },
};
