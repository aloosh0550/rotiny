import { db } from "@/lib/db/schema";
import type { Measurement, MeasurementRefType } from "@/lib/types";
import { createSyncMeta } from "@/lib/utils/sync";
import { syncEngine } from "@/lib/sync/SyncEngine";
import { makeSyncedRepository } from "./helpers";

function measurementId(refType: MeasurementRefType, refId: string, dateKey: string): string {
  const uid = syncEngine.currentUserId() ?? "local";
  return `${uid}:${refType}:${refId}:${dateKey}`;
}

const base = makeSyncedRepository<Measurement>(db.measurements, "measurements");

export const measurementsRepository = {
  ...base,

  async getForRefOnDate(
    refType: MeasurementRefType,
    refId: string,
    dateKey: string,
  ): Promise<Measurement | undefined> {
    const byId = await base.getById(measurementId(refType, refId, dateKey));
    if (byId) return byId;
    const all = await base.getAll();
    return all.find((m) => m.refType === refType && m.refId === refId && m.date === dateKey);
  },

  /** All days' values for one ref (for progress history / streaks). */
  async getForRef(refType: MeasurementRefType, refId: string): Promise<Measurement[]> {
    const all = await base.getAll();
    return all
      .filter((m) => m.refType === refType && m.refId === refId)
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  async getForDate(dateKey: string): Promise<Measurement[]> {
    const all = await base.getAll();
    return all.filter((m) => m.date === dateKey);
  },

  /** Set the absolute value for a ref on a day. */
  async setForDate(
    refType: MeasurementRefType,
    refId: string,
    dateKey: string,
    value: number,
    unit?: string | null,
  ): Promise<Measurement> {
    const existing = await this.getForRefOnDate(refType, refId, dateKey);
    if (existing) return base.update(existing.id, { value: Math.max(0, value), unit: unit ?? existing.unit });
    return base.create({
      id: measurementId(refType, refId, dateKey),
      refType,
      refId,
      date: dateKey,
      value: Math.max(0, value),
      unit: unit ?? null,
      sync: createSyncMeta(),
    });
  },

  /** Add (or subtract) `delta` to a ref's value on a day. Never goes below 0. */
  async addForDate(
    refType: MeasurementRefType,
    refId: string,
    dateKey: string,
    delta: number,
    unit?: string | null,
  ): Promise<Measurement> {
    const existing = await this.getForRefOnDate(refType, refId, dateKey);
    const next = Math.max(0, (existing?.value ?? 0) + delta);
    return this.setForDate(refType, refId, dateKey, next, unit);
  },
};

export { measurementId };
