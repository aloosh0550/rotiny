/**
 * The registry of synced entities: the Postgres table name, the matching Dexie
 * table, and (for the initial full pull) nothing more is needed — column
 * mapping is generic (see rowMapping.ts).
 *
 * Order matters for the initial pull / local->cloud upload: parents before
 * children so foreign keys resolve.
 *
 * `devices` is listed here (its Production migration
 * `20260913000000_phase10_devices.sql` is NOT yet applied) so `pullAll()` and
 * `cloudStore.subscribe()` are ready the moment it lands — both already
 * degrade gracefully for a table missing on the server (see
 * `CloudStore.isMissingTable` / the per-table probe in `subscribe()`). The one
 * piece deliberately still off is the *write* path: `devicesRepository` calls
 * `makeSyncedRepository` with no `entityType`, so a local mutation never
 * enqueues to the outbox — flipping that one line is the only code change
 * left once the migration is confirmed live (see `docs/PHASE_10_DEVICES_PLAN.md`).
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
  "daily_plans",
  "daily_energy",
  "measurements",
  "life_areas",
  "goals",
  "goal_milestones",
  "reviews",
  "achievements",
  "ai_conversations",
  "ai_memory",
  "ai_actions",
  "devices",
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
  daily_plans: "dailyPlans",
  daily_energy: "dailyEnergy",
  measurements: "measurements",
  life_areas: "lifeAreas",
  goals: "goals",
  goal_milestones: "goalMilestones",
  reviews: "reviews",
  achievements: "achievements",
  ai_conversations: "aiConversations",
  ai_memory: "aiMemory",
  ai_actions: "aiActions",
  devices: "devices",
};

/** Reverse: Dexie table name -> Postgres table. */
export const PG_TABLE: Record<string, SyncedTable> = Object.fromEntries(
  Object.entries(DEXIE_TABLE).map(([pg, dx]) => [dx, pg as SyncedTable]),
) as Record<string, SyncedTable>;
