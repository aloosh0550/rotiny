import type {
  CalendarProviderId,
  EnergyLevel,
  ID,
  Priority,
  RecurrenceRule,
  Reminder,
  SyncMeta,
} from "./shared";

export interface Appointment {
  id: ID;
  title: string;
  notes?: string;
  location?: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  recurrence?: RecurrenceRule | null;
  recurrenceParentId?: ID | null;
  reminders: Reminder[];
  participants?: string[];
  color?: string;
  calendarProviderId: CalendarProviderId;
  /** Device calendar event id (when mirrored to the phone calendar). */
  externalId?: string | null;
  /** Which device calendar the mirrored event lives in. */
  deviceCalendarId?: string | null;
  sync: SyncMeta;
}

export interface TaskCategory {
  id: ID;
  name: string;
  /** Extended-palette key: "blue" | "green" | "amber" | "cyan" | "violet" | ... */
  color: string;
  order: number;
  sync: SyncMeta;
}

export type TaskStatus = "pending" | "completed" | "carried_over" | "cancelled";

export interface Task {
  id: ID;
  title: string;
  notes?: string;
  dueAt?: string | null;
  hasTime: boolean;
  durationMinutes?: number | null;
  priority: Priority;
  status: TaskStatus;
  completedAt?: string | null;
  recurrence?: RecurrenceRule | null;
  reminders: Reminder[];
  linkedAppointmentId?: ID | null;
  originTaskId?: ID | null;
  /** Optional user category (see TaskCategory). */
  categoryId?: ID | null;
  /** "Most important" — surfaced first on Home, independent of priority. */
  pinned?: boolean;
  /** Links to a Life Area (Phase 7). */
  lifeAreaId?: ID | null;
  /** Links to a Goal (Phase 7). */
  goalId?: ID | null;
  /** Effort weight for the planner: "low" | "med" | "high". */
  energyCost?: "low" | "med" | "high" | null;
  /** Free context tags, e.g. ["البيت", "مشاوير"]. */
  context?: string[];
  /** The day the user intends to do it (distinct from `dueAt`). YYYY-MM-DD. */
  plannedFor?: string | null;
  sync: SyncMeta;
}

export interface HabitTarget {
  type: "count" | "duration";
  value: number;
  unit?: string;
}

/** A first-class tracker preset kind (a Habit configured for one). */
export type TrackerKind = "water" | "exercise" | "reading" | "skill";

export interface Habit {
  id: ID;
  title: string;
  notes?: string;
  recurrence: RecurrenceRule;
  timeOfDay?: string | null;
  target?: HabitTarget | null;
  reminders: Reminder[];
  color?: string;
  archivedAt?: string | null;
  /** Links to a Life Area (Phase 7). */
  lifeAreaId?: ID | null;
  /** Links to a Goal (Phase 7). */
  goalId?: ID | null;
  /** Set when this habit is one of the first-class trackers. */
  trackerKind?: TrackerKind | null;
  sync: SyncMeta;
}

export type MeasurementRefType = "habit" | "tracker" | "goal" | "custom";

/** A per-day numeric value for anything measurable (current vs. its target). */
export interface Measurement {
  /** deterministic: `<userId>:<refType>:<refId>:<YYYY-MM-DD>` */
  id: ID;
  refType: MeasurementRefType;
  refId: ID;
  date: string; // YYYY-MM-DD local key
  value: number;
  unit?: string | null;
  sync: SyncMeta;
}

export interface HabitCompletion {
  id: ID;
  habitId: ID;
  date: string; // YYYY-MM-DD local key
  completedAt: string;
  value?: number | null;
  sync: SyncMeta;
}

export type DhikrCategoryKind =
  | "morning"
  | "evening"
  | "after_prayer"
  | "sleep"
  | "wake"
  | "istighfar"
  | "custom";

export interface DhikrCategory {
  id: ID;
  kind: DhikrCategoryKind;
  title: string;
  order: number;
  isCustom: boolean;
  sync: SyncMeta;
}

export interface Dhikr {
  id: ID;
  categoryId: ID;
  text: string;
  transliteration?: string;
  translation?: string;
  targetCount: number;
  source?: string;
  order: number;
  isCustom: boolean;
  sync: SyncMeta;
}

export interface DhikrProgress {
  id: ID;
  dhikrId: ID;
  date: string; // YYYY-MM-DD local key
  count: number;
  completedAt?: string | null;
  sync: SyncMeta;
}

/* ------------------------------------------------------------------ Phase 4 -- */

export type DailyPlanRefType = "task" | "appointment" | "habit";
export type DailyPlanItemStatus = "pending" | "done" | "skipped" | "moved";
export type DailyPlanBucket = "morning" | "afternoon" | "evening";

export interface DailyPlanItem {
  refType: DailyPlanRefType;
  refId: ID;
  bucket: DailyPlanBucket;
  order: number;
  status: DailyPlanItemStatus;
  /** the planner's "لماذا الآن؟" line, captured at generation time */
  reason?: string;
}

export interface DailyPlan {
  /** deterministic: `<userId>:<YYYY-MM-DD>` (or `local:<date>` when signed out) */
  id: ID;
  date: string; // YYYY-MM-DD local key
  energy?: EnergyLevel | null;
  generatedBy: "local" | "ai" | "manual";
  items: DailyPlanItem[];
  regeneratedAt?: string | null;
  sync: SyncMeta;
}

export interface DailyEnergy {
  id: ID; // `<userId>:<YYYY-MM-DD>`
  date: string; // YYYY-MM-DD local key
  level: EnergyLevel;
  sync: SyncMeta;
}
