import type {
  CalendarProviderId,
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
  externalId?: string | null;
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
  sync: SyncMeta;
}

export interface HabitTarget {
  type: "count" | "duration";
  value: number;
  unit?: string;
}

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
