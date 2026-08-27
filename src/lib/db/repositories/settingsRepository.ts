import { db } from "@/lib/db/schema";
import type { UserSettings } from "@/lib/types";
import { DEFAULT_INTELLIGENCE_SETTINGS, DEFAULT_NOTIFICATION_PREFERENCES } from "@/lib/types";

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
    calendarProvider: "local",
    lastDailySummaryDate: null,
    lastSyncedAt: null,
    seedVersion: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export const settingsRepository = {
  /** Pure read — safe to call from useLiveQuery. Returns undefined until ensureDefaults() has run. */
  async get(): Promise<UserSettings | undefined> {
    return db.settings.get("singleton");
  },
  /** Read-modify-write — must never be called from within a useLiveQuery querier. */
  async ensureDefaults(): Promise<UserSettings> {
    const existing = await db.settings.get("singleton");
    if (existing) return existing;
    const defaults = createDefaultSettings();
    try {
      await db.settings.add(defaults);
      return defaults;
    } catch {
      // A concurrent caller (e.g. React Strict Mode's double effect invocation in dev)
      // may have created the record first — that's fine, just use it.
      const raceWinner = await db.settings.get("singleton");
      if (raceWinner) return raceWinner;
      throw new Error("Failed to create default settings");
    }
  },
  async update(patch: Partial<UserSettings>): Promise<UserSettings> {
    const current = await this.ensureDefaults();
    const updated: UserSettings = { ...current, ...patch, updatedAt: new Date().toISOString() };
    await db.settings.put(updated);
    return updated;
  },
};
