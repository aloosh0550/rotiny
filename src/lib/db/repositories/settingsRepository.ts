import { db } from "@/lib/db/schema";
import type { UserSettings } from "@/lib/types";
import {
  DEFAULT_ADHKAR_TIMES,
  DEFAULT_AI_SETTINGS,
  DEFAULT_CALENDAR_INTEGRATION,
  DEFAULT_INTELLIGENCE_SETTINGS,
  DEFAULT_NOTIFICATION_PREFERENCES,
  DEFAULT_PRAYER_TIMES_SETTINGS,
} from "@/lib/types";
import { isSupabaseConfigured } from "@/lib/config/env";
import { generateId } from "@/lib/utils/id";

async function enqueueSettingsPush(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    await db.syncQueue.add({
      id: generateId(),
      entityType: "settings",
      entityId: "singleton",
      operation: "update",
      payload: null,
      createdAt: new Date().toISOString(),
      attempts: 0,
    });
  } catch {
    /* best-effort */
  }
}

export function createDefaultSettings(): UserSettings {
  const now = new Date().toISOString();
  return {
    id: "singleton",
    locale: "ar",
    theme: "dark",
    onboardingCompleted: false,
    weekStartsOn: 0,
    notifications: DEFAULT_NOTIFICATION_PREFERENCES,
    intelligence: DEFAULT_INTELLIGENCE_SETTINGS,
    ai: DEFAULT_AI_SETTINGS,
    calendarProvider: "local",
    calendarIntegration: DEFAULT_CALENDAR_INTEGRATION,
    prayerTimes: DEFAULT_PRAYER_TIMES_SETTINGS,
    lastDailySummaryDate: null,
    lastSyncedAt: null,
    seedVersion: 0,
    createdAt: now,
    updatedAt: now,
  };
}

/** Backfill any nested settings keys added in later app versions onto an existing
 * record, without clobbering the user's choices. Additive only. */
function migrateSettingsShape(s: UserSettings): UserSettings {
  const notifications = {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...s.notifications,
    adhkarTimes: { ...DEFAULT_ADHKAR_TIMES, ...(s.notifications?.adhkarTimes ?? {}) },
  };
  return {
    ...s,
    notifications,
    intelligence: { ...DEFAULT_INTELLIGENCE_SETTINGS, ...s.intelligence },
    ai: { ...DEFAULT_AI_SETTINGS, ...s.ai },
    calendarIntegration: { ...DEFAULT_CALENDAR_INTEGRATION, ...s.calendarIntegration },
    prayerTimes: { ...DEFAULT_PRAYER_TIMES_SETTINGS, ...s.prayerTimes },
  };
}

export const settingsRepository = {
  /** Pure read — safe to call from useLiveQuery. Returns undefined until ensureDefaults() has run. */
  async get(): Promise<UserSettings | undefined> {
    const s = await db.settings.get("singleton");
    return s ? migrateSettingsShape(s) : undefined;
  },
  /** Read-modify-write — must never be called from within a useLiveQuery querier. */
  async ensureDefaults(): Promise<UserSettings> {
    const existing = await db.settings.get("singleton");
    if (existing) {
      const migrated = migrateSettingsShape(existing);
      // Only write back if the shape actually gained keys.
      if (JSON.stringify(migrated) !== JSON.stringify(existing)) {
        await db.settings.put(migrated);
      }
      return migrated;
    }
    const defaults = createDefaultSettings();
    try {
      await db.settings.add(defaults);
      return defaults;
    } catch {
      const raceWinner = await db.settings.get("singleton");
      if (raceWinner) return migrateSettingsShape(raceWinner);
      throw new Error("Failed to create default settings");
    }
  },
  async update(patch: Partial<UserSettings>): Promise<UserSettings> {
    const current = await this.ensureDefaults();
    const updated: UserSettings = { ...current, ...patch, updatedAt: new Date().toISOString() };
    await db.settings.put(updated);
    void enqueueSettingsPush();
    return updated;
  },

  /**
   * Apply settings received from the cloud WITHOUT re-enqueuing a push
   * (prevents a realtime echo loop). Used only by the SyncEngine.
   */
  async applyRemote(remote: Partial<UserSettings>): Promise<void> {
    const current = await this.ensureDefaults();
    await db.settings.put(migrateSettingsShape({ ...current, ...remote } as UserSettings));
  },
};
