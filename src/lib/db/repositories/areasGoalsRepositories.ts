import { db } from "@/lib/db/schema";
import type { Goal, GoalHorizon, GoalMilestone, LifeArea } from "@/lib/types";
import { generateId } from "@/lib/utils/id";
import { createSyncMeta } from "@/lib/utils/sync";
import { makeSyncedRepository } from "./helpers";

const areas = makeSyncedRepository<LifeArea>(db.lifeAreas, "lifeAreas");
const goals = makeSyncedRepository<Goal>(db.goals, "goals");
const milestones = makeSyncedRepository<GoalMilestone>(db.goalMilestones, "goalMilestones");

/** The 3 areas every account starts with. Seeded idempotently by `key`. */
export const DEFAULT_LIFE_AREAS: Omit<LifeArea, "id" | "sync">[] = [
  { key: "worship", name: "العبادات", icon: "book-open", color: "violet", order: 0, enabled: true, kind: "worship" },
  { key: "exercise", name: "الرياضة", icon: "dumbbell", color: "green", order: 1, enabled: true, kind: "exercise" },
  { key: "habits", name: "العادات", icon: "repeat", color: "cyan", order: 2, enabled: true, kind: "habits" },
];

export const lifeAreasRepository = {
  ...areas,

  async getAllSorted(): Promise<LifeArea[]> {
    return (await areas.getAll()).sort((a, b) => a.order - b.order);
  },
  async getByKey(key: string): Promise<LifeArea | undefined> {
    return (await areas.getAll()).find((a) => a.key === key);
  },

  /** Insert any missing default area (idempotent, keyed by `key`). */
  async ensureDefaults(): Promise<void> {
    const present = new Set((await areas.getAll()).map((a) => a.key));
    for (const def of DEFAULT_LIFE_AREAS) {
      if (present.has(def.key)) continue;
      await areas.create({ id: generateId(), ...def, sync: createSyncMeta() });
    }
  },

  /** Move an area up/down among its siblings. */
  async reorder(id: string, dir: -1 | 1): Promise<void> {
    const list = await this.getAllSorted();
    const idx = list.findIndex((a) => a.id === id);
    const swap = list[idx + dir];
    if (idx < 0 || !swap) return;
    await areas.update(id, { order: swap.order });
    await areas.update(swap.id, { order: list[idx].order });
  },
};

export const goalsRepository = {
  ...goals,

  async getForArea(lifeAreaId: string): Promise<Goal[]> {
    return (await goals.getAll()).filter((g) => g.lifeAreaId === lifeAreaId);
  },
  async getByHorizon(horizon: GoalHorizon): Promise<Goal[]> {
    return (await goals.getAll()).filter((g) => g.horizon === horizon);
  },
  async getChildren(parentGoalId: string): Promise<Goal[]> {
    return (await goals.getAll()).filter((g) => g.parentGoalId === parentGoalId);
  },
};

export const goalMilestonesRepository = {
  ...milestones,

  async getForGoal(goalId: string): Promise<GoalMilestone[]> {
    return (await milestones.getAll())
      .filter((m) => m.goalId === goalId)
      .sort((a, b) => a.order - b.order);
  },
};
