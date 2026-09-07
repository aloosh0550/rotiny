import type { CalendarProviderId, EntityType, ID } from "./shared";

export type ThemeMode = "light" | "dark" | "system";
export type Locale = "ar" | "en";

export interface AdhkarReminderTimes {
  morning: string; // "HH:mm"
  evening: string;
  afterPrayer: string;
  sleep: string;
  wake: string;
  istighfar: string;
}

/** Default reminder lead-times (minutes before) applied to new tasks/appointments. */
export type ReminderDefaults = number[];

export interface NotificationPreferences {
  enabled: boolean;
  appointmentReminders: boolean;
  taskDueReminders: boolean;
  habitReminders: boolean;
  adhkarReminders: boolean;
  freeTimeSuggestions: boolean;
  overdueTaskAlerts: boolean;
  dailySummary: boolean;
  dailyPlanReminder: boolean;
  dailyPlanReminderTime: string; // "HH:mm"
  adhkarTimes: AdhkarReminderTimes;
  /** Lead-times (minutes before) pre-selected on new tasks & appointments. */
  reminderDefaults: number[];
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
}

export interface IntelligenceSettings {
  nlpEnabled: boolean;
  autoFillConfidenceThreshold: number; // 0..1
  suggestFreeSlots: boolean;
  conflictDetection: boolean;
}

export type PrayerCalculationMethod =
  | "UmmAlQura"
  | "MuslimWorldLeague"
  | "Egyptian"
  | "Karachi"
  | "Dubai"
  | "Qatar"
  | "Kuwait"
  | "MoonsightingCommittee"
  | "NorthAmerica";

export interface PrayerTimesSettings {
  enabled: boolean;
  method: PrayerCalculationMethod;
  /** Preset city key (see PRESET_CITIES) or "custom". */
  city: string;
  latitude: number;
  longitude: number;
  notify: boolean;
  /** Minutes before the prayer to notify. */
  notifyOffsetMinutes: number;
}

export type AiPersonality = "supportive" | "direct" | "concise" | "playful" | "analytical";
export type AiProviderId = "gemini" | "none";

/**
 * AI is entirely opt-in. `enabled` off → no provider is ever constructed, no
 * context is built, no request leaves the device. The core app is unaffected
 * either way. No API key lives here or anywhere in the client — see
 * `src/lib/ai/geminiProvider.ts`.
 */
export interface AiSettings {
  enabled: boolean;
  provider: AiProviderId;
  /** the assistant's display name, e.g. "رفيق" */
  assistantName: string;
  personality: AiPersonality;
  /** when off: no memory is written and none is sent in context */
  memoryEnabled: boolean;
  /** when off: chat still works but no task/habit/plan context is attached */
  shareContext: boolean;
}

export interface CalendarIntegrationSettings {
  /** User has turned on device-calendar sync for appointments. */
  enabled: boolean;
  /** Which device calendar new Routini events are written to. */
  deviceCalendarId?: string | null;
  deviceCalendarName?: string | null;
  /** Show read-only events from the phone calendar inside Routini. */
  showDeviceEvents: boolean;
}

export interface UserSettings {
  id: "singleton";
  locale: Locale;
  theme: ThemeMode;
  onboardingCompleted: boolean;
  weekStartsOn: 0 | 1 | 6;
  notifications: NotificationPreferences;
  intelligence: IntelligenceSettings;
  ai: AiSettings;
  calendarProvider: CalendarProviderId;
  calendarIntegration: CalendarIntegrationSettings;
  prayerTimes: PrayerTimesSettings;
  lastDailySummaryDate?: string | null;
  lastSyncedAt?: string | null;
  seedVersion: number;
  createdAt: string;
  updatedAt: string;
}

export type SyncOperation = "create" | "update" | "delete";

export interface SyncQueueEntry {
  id: ID;
  entityType: EntityType | "settings" | "taskCategory";
  entityId: ID;
  operation: SyncOperation;
  payload: unknown;
  createdAt: string;
  attempts: number;
  lastError?: string | null;
}

export const DEFAULT_ADHKAR_TIMES: AdhkarReminderTimes = {
  morning: "06:30",
  evening: "17:30",
  afterPrayer: "13:00",
  sleep: "22:30",
  wake: "05:30",
  istighfar: "20:00",
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  appointmentReminders: true,
  taskDueReminders: true,
  habitReminders: true,
  adhkarReminders: false,
  freeTimeSuggestions: true,
  overdueTaskAlerts: true,
  dailySummary: true,
  dailyPlanReminder: false,
  dailyPlanReminderTime: "08:00",
  adhkarTimes: DEFAULT_ADHKAR_TIMES,
  reminderDefaults: [30],
  quietHoursStart: "22:00",
  quietHoursEnd: "07:00",
};

export const DEFAULT_AI_SETTINGS: AiSettings = {
  enabled: false,
  provider: "gemini",
  assistantName: "رفيق",
  personality: "supportive",
  memoryEnabled: true,
  shareContext: true,
};

export const DEFAULT_INTELLIGENCE_SETTINGS: IntelligenceSettings = {
  nlpEnabled: true,
  autoFillConfidenceThreshold: 0.6,
  suggestFreeSlots: true,
  conflictDetection: true,
};

export const DEFAULT_CALENDAR_INTEGRATION: CalendarIntegrationSettings = {
  enabled: false,
  deviceCalendarId: null,
  deviceCalendarName: null,
  showDeviceEvents: true,
};

/** Preset cities so prayer times work with no location permission. */
export const PRESET_CITIES: Record<string, { label: string; lat: number; lng: number }> = {
  makkah: { label: "مكة المكرمة", lat: 21.4225, lng: 39.8262 },
  madinah: { label: "المدينة المنورة", lat: 24.4686, lng: 39.6142 },
  riyadh: { label: "الرياض", lat: 24.7136, lng: 46.6753 },
  jeddah: { label: "جدة", lat: 21.4858, lng: 39.1925 },
  dammam: { label: "الدمام", lat: 26.4207, lng: 50.0888 },
  kuwait: { label: "الكويت", lat: 29.3759, lng: 47.9774 },
  doha: { label: "الدوحة", lat: 25.2854, lng: 51.531 },
  dubai: { label: "دبي", lat: 25.2048, lng: 55.2708 },
  abudhabi: { label: "أبوظبي", lat: 24.4539, lng: 54.3773 },
  manama: { label: "المنامة", lat: 26.2285, lng: 50.586 },
  muscat: { label: "مسقط", lat: 23.588, lng: 58.3829 },
  amman: { label: "عمّان", lat: 31.9454, lng: 35.9284 },
  cairo: { label: "القاهرة", lat: 30.0444, lng: 31.2357 },
  istanbul: { label: "إسطنبول", lat: 41.0082, lng: 28.9784 },
};

export const DEFAULT_PRAYER_TIMES_SETTINGS: PrayerTimesSettings = {
  enabled: false,
  method: "UmmAlQura",
  city: "makkah",
  latitude: PRESET_CITIES.makkah.lat,
  longitude: PRESET_CITIES.makkah.lng,
  notify: false,
  notifyOffsetMinutes: 10,
};
