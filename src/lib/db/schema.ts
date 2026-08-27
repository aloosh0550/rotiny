import Dexie, { type Table } from "dexie";
import type {
  Appointment,
  Task,
  Habit,
  HabitCompletion,
  DhikrCategory,
  Dhikr,
  DhikrProgress,
  UserSettings,
  SyncQueueEntry,
} from "@/lib/types";

export class RoutiniDB extends Dexie {
  appointments!: Table<Appointment, string>;
  tasks!: Table<Task, string>;
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
  }
}

export const db = new RoutiniDB();
