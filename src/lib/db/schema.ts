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
  }
}

export const db = new RoutiniDB();
