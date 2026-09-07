import { db } from "@/lib/db/schema";
import type { DailyPlan, DailyEnergy, EnergyLevel } from "@/lib/types";
import { createSyncMeta } from "@/lib/utils/sync";
import { syncEngine } from "@/lib/sync/SyncEngine";
import { makeSyncedRepository } from "./helpers";

/**
 * Deterministic per-day id so a day's row is addressable and cross-device
 * upserts dedupe on the primary key. `local:` prefix when signed out (never
 * synced, but still consistent on-device).
 */
function dayId(dateKey: string): string {
  const uid = syncEngine.currentUserId();
  return `${uid ?? "local"}:${dateKey}`;
}

const plans = makeSyncedRepository<DailyPlan>(db.dailyPlans, "dailyPlans");
const energy = makeSyncedRepository<DailyEnergy>(db.dailyEnergy, "dailyEnergy");

export const dailyPlansRepository = {
  ...plans,

  async getForDate(dateKey: string): Promise<DailyPlan | undefined> {
    const byId = await plans.getById(dayId(dateKey));
    if (byId) return byId;
    // fall back to a scan (id scheme changed on sign-in/out)
    const all = await plans.getAll();
    return all.find((p) => p.date === dateKey);
  },

  /** Newest first, capped. For the "history" view. */
  async getRecent(limit = 30): Promise<DailyPlan[]> {
    const all = await plans.getAll();
    return all.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
  },

  /** Create or replace the plan for a day. */
  async upsertForDate(
    dateKey: string,
    data: Omit<DailyPlan, "id" | "date" | "sync">,
  ): Promise<DailyPlan> {
    const existing = await this.getForDate(dateKey);
    if (existing) {
      return plans.update(existing.id, { ...data });
    }
    const now = new Date().toISOString();
    const row: DailyPlan = { id: dayId(dateKey), date: dateKey, ...data, sync: createSyncMeta(now) };
    return plans.create(row);
  },
};

export const dailyEnergyRepository = {
  ...energy,

  async getForDate(dateKey: string): Promise<DailyEnergy | undefined> {
    const byId = await energy.getById(dayId(dateKey));
    if (byId) return byId;
    const all = await energy.getAll();
    return all.find((e) => e.date === dateKey);
  },

  async setForDate(dateKey: string, level: EnergyLevel): Promise<DailyEnergy> {
    const existing = await this.getForDate(dateKey);
    if (existing) return energy.update(existing.id, { level });
    const now = new Date().toISOString();
    return energy.create({ id: dayId(dateKey), date: dateKey, level, sync: createSyncMeta(now) });
  },
};
