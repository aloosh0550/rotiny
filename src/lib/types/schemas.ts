import { z } from "zod";

/**
 * Structural validation for backup import files. These schemas intentionally mirror
 * the shapes in `./models.ts`, `./shared.ts`, and `./settings.ts` closely enough to
 * catch corrupt/foreign JSON, without being exhaustively strict (unknown extra fields
 * on an object are fine — Dexie only cares about the fields it knows about).
 */

const idSchema = z.string().min(1);

const syncMetaSchema = z.object({
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable().optional(),
  syncStatus: z.enum(["synced", "pending", "conflict"]),
  remoteId: z.string().nullable().optional(),
  version: z.number(),
});

const recurrenceRuleSchema = z.object({
  frequency: z.enum(["daily", "weekly", "monthly", "custom"]),
  interval: z.number(),
  byWeekday: z.array(z.number()).optional(),
  byMonthDay: z.array(z.number()).optional(),
  count: z.number().optional(),
  until: z.string().nullable().optional(),
});

const reminderSchema = z.object({
  id: idSchema,
  offsetMinutes: z.number(),
  method: z.enum(["push", "inapp"]),
});

const calendarProviderSchema = z.enum(["local", "device", "google", "apple", "microsoft"]);

export const appointmentSchema = z.object({
  id: idSchema,
  title: z.string(),
  notes: z.string().optional(),
  location: z.string().optional(),
  startAt: z.string(),
  endAt: z.string(),
  allDay: z.boolean(),
  recurrence: recurrenceRuleSchema.nullable().optional(),
  recurrenceParentId: idSchema.nullable().optional(),
  reminders: z.array(reminderSchema),
  participants: z.array(z.string()).optional(),
  color: z.string().optional(),
  calendarProviderId: calendarProviderSchema,
  externalId: z.string().nullable().optional(),
  deviceCalendarId: z.string().nullable().optional(),
  sync: syncMetaSchema,
});

export const taskSchema = z.object({
  id: idSchema,
  title: z.string(),
  notes: z.string().optional(),
  dueAt: z.string().nullable().optional(),
  hasTime: z.boolean(),
  durationMinutes: z.number().nullable().optional(),
  priority: z.enum(["important", "normal", "later"]),
  status: z.enum(["pending", "completed", "carried_over", "cancelled"]),
  completedAt: z.string().nullable().optional(),
  recurrence: recurrenceRuleSchema.nullable().optional(),
  reminders: z.array(reminderSchema),
  linkedAppointmentId: idSchema.nullable().optional(),
  originTaskId: idSchema.nullable().optional(),
  categoryId: idSchema.nullable().optional(),
  pinned: z.boolean().optional(),
  lifeAreaId: idSchema.nullable().optional(),
  goalId: idSchema.nullable().optional(),
  energyCost: z.enum(["low", "med", "high"]).nullable().optional(),
  context: z.array(z.string()).optional(),
  plannedFor: z.string().nullable().optional(),
  sync: syncMetaSchema,
});

export const taskCategorySchema = z.object({
  id: idSchema,
  name: z.string(),
  color: z.string(),
  order: z.number(),
  sync: syncMetaSchema,
});

const habitTargetSchema = z.object({
  type: z.enum(["count", "duration"]),
  value: z.number(),
  unit: z.string().optional(),
});

export const habitSchema = z.object({
  id: idSchema,
  title: z.string(),
  notes: z.string().optional(),
  recurrence: recurrenceRuleSchema,
  timeOfDay: z.string().nullable().optional(),
  target: habitTargetSchema.nullable().optional(),
  reminders: z.array(reminderSchema),
  color: z.string().optional(),
  archivedAt: z.string().nullable().optional(),
  lifeAreaId: idSchema.nullable().optional(),
  goalId: idSchema.nullable().optional(),
  trackerKind: z.enum(["water", "exercise", "reading", "skill"]).nullable().optional(),
  sync: syncMetaSchema,
});

export const lifeAreaSchema = z.object({
  id: idSchema,
  key: z.string(),
  name: z.string(),
  icon: z.string(),
  color: z.string(),
  order: z.number(),
  enabled: z.boolean(),
  kind: z.string(),
  sync: syncMetaSchema,
});

export const goalSchema = z.object({
  id: idSchema,
  lifeAreaId: idSchema.nullable().optional(),
  parentGoalId: idSchema.nullable().optional(),
  title: z.string(),
  description: z.string().nullable().optional(),
  horizon: z.enum(["long", "month", "week"]),
  targetValue: z.number().nullable().optional(),
  targetUnit: z.string().nullable().optional(),
  deadline: z.string().nullable().optional(),
  status: z.enum(["active", "done", "paused", "dropped"]),
  sync: syncMetaSchema,
});

export const goalMilestoneSchema = z.object({
  id: idSchema,
  goalId: idSchema,
  title: z.string(),
  targetValue: z.number().nullable().optional(),
  currentValue: z.number(),
  done: z.boolean(),
  order: z.number(),
  sync: syncMetaSchema,
});

export const measurementSchema = z.object({
  id: idSchema,
  refType: z.enum(["habit", "tracker", "goal", "custom"]),
  refId: idSchema,
  date: z.string(),
  value: z.number(),
  unit: z.string().nullable().optional(),
  sync: syncMetaSchema,
});

export const habitCompletionSchema = z.object({
  id: idSchema,
  habitId: idSchema,
  date: z.string(),
  completedAt: z.string(),
  value: z.number().nullable().optional(),
  sync: syncMetaSchema,
});

export const dhikrCategorySchema = z.object({
  id: idSchema,
  kind: z.enum(["morning", "evening", "after_prayer", "sleep", "wake", "istighfar", "custom"]),
  title: z.string(),
  order: z.number(),
  isCustom: z.boolean(),
  sync: syncMetaSchema,
});

export const dhikrSchema = z.object({
  id: idSchema,
  categoryId: idSchema,
  text: z.string(),
  transliteration: z.string().optional(),
  translation: z.string().optional(),
  targetCount: z.number(),
  source: z.string().optional(),
  order: z.number(),
  isCustom: z.boolean(),
  sync: syncMetaSchema,
});

export const dhikrProgressSchema = z.object({
  id: idSchema,
  dhikrId: idSchema,
  date: z.string(),
  count: z.number(),
  completedAt: z.string().nullable().optional(),
  sync: syncMetaSchema,
});

const energyLevelSchema = z.enum(["high", "good", "medium", "low"]);

export const dailyPlanSchema = z.object({
  id: idSchema,
  date: z.string(),
  energy: energyLevelSchema.nullable().optional(),
  generatedBy: z.enum(["local", "ai", "manual"]),
  items: z.array(
    z.object({
      refType: z.enum(["task", "appointment", "habit"]),
      refId: idSchema,
      bucket: z.enum(["morning", "afternoon", "evening"]),
      order: z.number(),
      status: z.enum(["pending", "done", "skipped", "moved"]),
      reason: z.string().optional(),
    }),
  ),
  regeneratedAt: z.string().nullable().optional(),
  sync: syncMetaSchema,
});

export const dailyEnergySchema = z.object({
  id: idSchema,
  date: z.string(),
  level: energyLevelSchema,
  sync: syncMetaSchema,
});

export const reviewSchema = z.object({
  id: idSchema,
  period: z.enum(["day", "week", "month"]),
  periodKey: z.string(),
  metrics: z.record(z.string(), z.unknown()),
  aiNote: z.string().nullable().optional(),
  sync: syncMetaSchema,
});

export const achievementSchema = z.object({
  id: idSchema,
  key: z.string(),
  unlockedAt: z.string().nullable().optional(),
  progress: z.object({ current: z.number(), target: z.number() }),
  sync: syncMetaSchema,
});

export const aiConversationSchema = z.object({
  id: idSchema,
  title: z.string(),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
      ts: z.string(),
    }),
  ),
  pinned: z.boolean().optional(),
  sync: syncMetaSchema,
});

export const aiMemorySchema = z.object({
  id: idSchema,
  kind: z.enum(["preference", "pattern", "fact"]),
  text: z.string(),
  source: z.string().nullable().optional(),
  enabled: z.boolean(),
  confidence: z.number().nullable().optional(),
  sync: syncMetaSchema,
});

// Settings shapes evolve version-to-version; keep the backup schema lenient so an
// older/newer export still imports. `settingsRepository.migrateSettingsShape` fills gaps.
const notificationPreferencesSchema = z.looseObject({ enabled: z.boolean() });
const intelligenceSettingsSchema = z.looseObject({ nlpEnabled: z.boolean() });

export const userSettingsSchema = z.looseObject({
  id: z.literal("singleton"),
  locale: z.enum(["ar", "en"]),
  theme: z.enum(["light", "dark", "system"]),
  onboardingCompleted: z.boolean(),
  weekStartsOn: z.union([z.literal(0), z.literal(1), z.literal(6)]),
  notifications: notificationPreferencesSchema,
  intelligence: intelligenceSettingsSchema,
  calendarProvider: calendarProviderSchema,
  lastDailySummaryDate: z.string().nullable().optional(),
  lastSyncedAt: z.string().nullable().optional(),
  seedVersion: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const syncQueueEntrySchema = z.object({
  id: idSchema,
  entityType: z.enum(["appointment", "task", "habit", "dhikr", "settings", "taskCategory", "dailyPlan", "dailyEnergy", "measurement", "lifeArea", "goal", "goalMilestone", "review", "achievement", "aiConversation", "aiMemory"]),
  entityId: idSchema,
  operation: z.enum(["create", "update", "delete"]),
  payload: z.unknown(),
  createdAt: z.string(),
  attempts: z.number(),
  lastError: z.string().nullable().optional(),
});

export const backupDataSchema = z.object({
  version: z.number(),
  exportedAt: z.string(),
  data: z.object({
    appointments: z.array(appointmentSchema),
    tasks: z.array(taskSchema),
    taskCategories: z.array(taskCategorySchema).optional(),
    habits: z.array(habitSchema),
    habitCompletions: z.array(habitCompletionSchema),
    dhikrCategories: z.array(dhikrCategorySchema),
    adhkar: z.array(dhikrSchema),
    dhikrProgress: z.array(dhikrProgressSchema),
    dailyPlans: z.array(dailyPlanSchema).optional(),
    dailyEnergy: z.array(dailyEnergySchema).optional(),
    measurements: z.array(measurementSchema).optional(),
    lifeAreas: z.array(lifeAreaSchema).optional(),
    goals: z.array(goalSchema).optional(),
    goalMilestones: z.array(goalMilestoneSchema).optional(),
    reviews: z.array(reviewSchema).optional(),
    achievements: z.array(achievementSchema).optional(),
    aiConversations: z.array(aiConversationSchema).optional(),
    aiMemory: z.array(aiMemorySchema).optional(),
    settings: z.array(userSettingsSchema),
    syncQueue: z.array(syncQueueEntrySchema),
  }),
});

// Runtime validation is via `backupDataSchema`; the exported type is model-based so
// the backup page can round-trip repository rows without inference friction.
export interface BackupData {
  version: number;
  exportedAt: string;
  data: {
    appointments: import("./models").Appointment[];
    tasks: import("./models").Task[];
    taskCategories?: import("./models").TaskCategory[];
    habits: import("./models").Habit[];
    habitCompletions: import("./models").HabitCompletion[];
    dhikrCategories: import("./models").DhikrCategory[];
    adhkar: import("./models").Dhikr[];
    dhikrProgress: import("./models").DhikrProgress[];
    dailyPlans?: import("./models").DailyPlan[];
    dailyEnergy?: import("./models").DailyEnergy[];
    measurements?: import("./models").Measurement[];
    lifeAreas?: import("./models").LifeArea[];
    goals?: import("./models").Goal[];
    goalMilestones?: import("./models").GoalMilestone[];
    reviews?: import("./models").Review[];
    achievements?: import("./models").Achievement[];
    aiConversations?: import("./models").AiConversation[];
    aiMemory?: import("./models").AiMemory[];
    settings: import("./settings").UserSettings[];
    syncQueue: import("./settings").SyncQueueEntry[];
  };
}
