/**
 * The registry of synced entities: the Postgres table name, the matching Dexie
 * table, and (for the initial full pull) nothing more is needed — column
 * mapping is generic (see rowMapping.ts).
 *
 * Order matters for the initial pull / local->cloud upload: parents before
 * children so foreign keys resolve.
 */

export const SYNCED_TABLES = [
  "task_categories",
  "tasks",
  "appointments",
  "habits",
  "habit_completions",
  "dhikr_categories",
  "adhkar",
  "dhikr_progress",
] as const;

export type SyncedTable = (typeof SYNCED_TABLES)[number];

/** Postgres table  ->  Dexie table name (they differ only in snake_case vs camelCase). */
export const DEXIE_TABLE: Record<SyncedTable, string> = {
  task_categories: "taskCategories",
  tasks: "tasks",
  appointments: "appointments",
  habits: "habits",
  habit_completions: "habitCompletions",
  dhikr_categories: "dhikrCategories",
  adhkar: "adhkar",
  dhikr_progress: "dhikrProgress",
};

/** Reverse: Dexie table name -> Postgres table. */
export const PG_TABLE: Record<string, SyncedTable> = Object.fromEntries(
  Object.entries(DEXIE_TABLE).map(([pg, dx]) => [dx, pg as SyncedTable]),
) as Record<string, SyncedTable>;
