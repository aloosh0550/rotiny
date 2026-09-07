import Dexie, { type Table } from "dexie";
import type {
  Appointment,
  Task,
  TaskCategory,
  Habit,
  HabitCompletion,
  DhikrCategory,
  Dhikr,
  DhikrProgress,
  DailyPlan,
  DailyEnergy,
  Measurement,
  LifeArea,
  Goal,
  GoalMilestone,
  Review,
  Achievement,
  AiConversation,
  AiMemory,
  UserSettings,
  SyncQueueEntry,
} from "@/lib/types";
import { createSyncMeta } from "@/lib/utils/sync";

/** Default task categories, inserted by the v2 migration and on fresh installs. */
export const DEFAULT_TASK_CATEGORIES: { name: string; color: string }[] = [
  { name: "عمل", color: "blue" },
  { name: "شخصي", color: "green" },
  { name: "المنزل", color: "amber" },
  { name: "صحة", color: "cyan" },
];

export class RoutiniDB extends Dexie {
  appointments!: Table<Appointment, string>;
  tasks!: Table<Task, string>;
  taskCategories!: Table<TaskCategory, string>;
  habits!: Table<Habit, string>;
  habitCompletions!: Table<HabitCompletion, string>;
  dhikrCategories!: Table<DhikrCategory, string>;
  adhkar!: Table<Dhikr, string>;
  dhikrProgress!: Table<DhikrProgress, string>;
  dailyPlans!: Table<DailyPlan, string>;
  dailyEnergy!: Table<DailyEnergy, string>;
  measurements!: Table<Measurement, string>;
  lifeAreas!: Table<LifeArea, string>;
  goals!: Table<Goal, string>;
  goalMilestones!: Table<GoalMilestone, string>;
  reviews!: Table<Review, string>;
  achievements!: Table<Achievement, string>;
  aiConversations!: Table<AiConversation, string>;
  aiMemory!: Table<AiMemory, string>;
  settings!: Table<UserSettings, string>;
  syncQueue!: Table<SyncQueueEntry, string>;

  constructor() {
    super("routini-db");

    this.version(1).stores({
      appointments: "id, startAt, endAt, recurrenceParentId, sync.deletedAt",
      tasks: "id, dueAt, status, priority, sync.deletedAt",
      habits: "id, archivedAt, sync.deletedAt",
      habitCompletions: "id, habitId, date, [habitId+date]",
      dhikrCategories: "id, kind, order, sync.deletedAt",
      adhkar: "id, categoryId, order, sync.deletedAt",
      dhikrProgress: "id, dhikrId, date, [dhikrId+date]",
      settings: "id",
      syncQueue: "id, entityType, createdAt",
    });

    // v2 — additive: task categories + category/pinned on tasks + device-calendar
    // linkage on appointments. No records are deleted; existing rows get defaults.
    this.version(2)
      .stores({
        appointments: "id, startAt, endAt, recurrenceParentId, externalId, sync.deletedAt",
        tasks: "id, dueAt, status, priority, categoryId, pinned, sync.deletedAt",
        taskCategories: "id, order, sync.deletedAt",
      })
      .upgrade(async (tx) => {
        await tx
          .table<Task, string>("tasks")
          .toCollection()
          .modify((t) => {
            if (t.categoryId === undefined) t.categoryId = null;
            if (t.pinned === undefined) t.pinned = false;
          });
        await tx
          .table<Appointment, string>("appointments")
          .toCollection()
          .modify((a) => {
            if (a.deviceCalendarId === undefined) a.deviceCalendarId = null;
            if (a.externalId === undefined) a.externalId = null;
          });
        const cats = tx.table<TaskCategory, string>("taskCategories");
        const count = await cats.count();
        if (count === 0) {
          const now = new Date().toISOString();
          await cats.bulkAdd(
            DEFAULT_TASK_CATEGORIES.map((c, i) => ({
              id: crypto.randomUUID(),
              name: c.name,
              color: c.color,
              order: i,
              sync: createSyncMeta(now),
            })),
          );
        }
      });

    // v3 — additive: persisted daily plan + daily energy (Phase 4). New stores
    // only; no existing record is read or modified.
    this.version(3).stores({
      dailyPlans: "id, date, sync.deletedAt",
      dailyEnergy: "id, date, sync.deletedAt",
    });

    // v4 — additive: per-day numeric measurements (Phase 6). New store only.
    this.version(4).stores({
      measurements: "id, refId, date, [refType+refId], sync.deletedAt",
    });

    // v5 — additive: Life Areas + Goals + Milestones (Phase 7). New stores only.
    this.version(5).stores({
      lifeAreas: "id, key, order, sync.deletedAt",
      goals: "id, lifeAreaId, horizon, parentGoalId, sync.deletedAt",
      goalMilestones: "id, goalId, order, sync.deletedAt",
    });

    // v6 — additive: Reviews + Achievements (Phase 8). New stores only.
    this.version(6).stores({
      reviews: "id, [period+periodKey], sync.deletedAt",
      achievements: "id, key, sync.deletedAt",
    });

    // v7 — additive: AI conversations + user-managed AI memory (Phase 9). New
    // stores only; nothing else is read or modified. Present but unused until
    // the user turns AI on.
    this.version(7).stores({
      aiConversations: "id, sync.deletedAt",
      aiMemory: "id, kind, sync.deletedAt",
    });
  }
}

export const db = new RoutiniDB();
