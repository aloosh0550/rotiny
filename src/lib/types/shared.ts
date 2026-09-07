export type ID = string;

export type Priority = "important" | "normal" | "later";

export const PRIORITY_ORDER: Priority[] = ["important", "normal", "later"];

export type EntityType =
  | "appointment"
  | "task"
  | "habit"
  | "dhikr"
  | "dailyPlan"
  | "dailyEnergy"
  | "measurement"
  | "lifeArea"
  | "goal"
  | "goalMilestone"
  | "review"
  | "achievement"
  | "aiConversation"
  | "aiMemory";

export type EnergyLevel = "high" | "good" | "medium" | "low";

export type SyncStatus = "synced" | "pending" | "conflict";

export interface SyncMeta {
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  syncStatus: SyncStatus;
  remoteId?: string | null;
  version: number;
}

export type RecurrenceFrequency = "daily" | "weekly" | "monthly" | "custom";

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number;
  byWeekday?: number[];
  byMonthDay?: number[];
  count?: number;
  until?: string | null;
}

export type ReminderMethod = "push" | "inapp";

export interface Reminder {
  id: ID;
  offsetMinutes: number;
  method: ReminderMethod;
}

export type CalendarProviderId = "local" | "device" | "google" | "apple" | "microsoft";
