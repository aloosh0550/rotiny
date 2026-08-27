import type { CalendarProviderId, EntityType, ID } from "./shared";

export type ThemeMode = "light" | "dark" | "system";
export type Locale = "ar" | "en";

export interface NotificationPreferences {
  enabled: boolean;
  appointmentReminders: boolean;
  taskDueReminders: boolean;
  habitReminders: boolean;
  freeTimeSuggestions: boolean;
  overdueTaskAlerts: boolean;
  dailySummary: boolean;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
}

export interface IntelligenceSettings {
  nlpEnabled: boolean;
  autoFillConfidenceThreshold: number; // 0..1
  suggestFreeSlots: boolean;
  conflictDetection: boolean;
}

export interface UserSettings {
  id: "singleton";
  locale: Locale;
  theme: ThemeMode;
  onboardingCompleted: boolean;
  weekStartsOn: 0 | 1 | 6;
  notifications: NotificationPreferences;
  intelligence: IntelligenceSettings;
  calendarProvider: CalendarProviderId;
  lastDailySummaryDate?: string | null;
  lastSyncedAt?: string | null;
  seedVersion: number;
  createdAt: string;
  updatedAt: string;
}

export type SyncOperation = "create" | "update" | "delete";

export interface SyncQueueEntry {
  id: ID;
  entityType: EntityType | "settings";
  entityId: ID;
  operation: SyncOperation;
  payload: unknown;
  createdAt: string;
  attempts: number;
  lastError?: string | null;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  appointmentReminders: true,
  taskDueReminders: true,
  habitReminders: true,
  freeTimeSuggestions: true,
  overdueTaskAlerts: true,
  dailySummary: true,
  quietHoursStart: "22:00",
  quietHoursEnd: "07:00",
};

export const DEFAULT_INTELLIGENCE_SETTINGS: IntelligenceSettings = {
  nlpEnabled: true,
  autoFillConfidenceThreshold: 0.6,
  suggestFreeSlots: true,
  conflictDetection: true,
};
