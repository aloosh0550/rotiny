import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db/schema";
import { buildSnapshot } from "@/lib/services/widget/WidgetBridgeService";
import { createSyncMeta } from "@/lib/utils/sync";
import { todayKey } from "@/lib/time/dateUtils";

const SYNC = () => createSyncMeta();

async function clearAll() {
  await Promise.all(db.tables.map((t) => t.clear()));
}

beforeEach(clearAll);
afterEach(clearAll);

describe("buildSnapshot (Phase 10 widget data)", () => {
  it("returns the versioned shape with the new fields even when empty", async () => {
    const snap = await buildSnapshot();
    expect(snap.v).toBe(2);
    expect(snap.now).toBeNull();
    expect(snap.energy).toBeNull();
    expect(snap.goals).toEqual([]);
    expect(snap.progress).toEqual({ done: 0, total: 0 });
  });

  it("surfaces the deterministic planner's 'now' item and today's energy", async () => {
    await db.tasks.add({
      id: "t1",
      title: "مهمة مهمة",
      hasTime: false,
      priority: "important",
      status: "pending",
      reminders: [],
      sync: SYNC(),
    });
    await db.dailyEnergy.add({
      id: `local:${todayKey()}`,
      date: todayKey(),
      level: "good",
      sync: SYNC(),
    });

    const snap = await buildSnapshot();
    expect(snap.energy).toBe("good");
    expect(snap.now).not.toBeNull();
    expect(snap.now!.title).toBe("مهمة مهمة");
    expect(snap.now!.type).toBe("task");
    expect(typeof snap.now!.reason).toBe("string");
  });

  it("includes top active goals with real derived progress (milestones)", async () => {
    await db.goals.add({
      id: "g1",
      title: "قراءة كتاب",
      horizon: "month",
      status: "active",
      deadline: "2026-10-01",
      sync: SYNC(),
    });
    await db.goalMilestones.bulkAdd([
      { id: "m1", goalId: "g1", title: "نصف", currentValue: 0, done: true, order: 0, sync: SYNC() },
      { id: "m2", goalId: "g1", title: "كامل", currentValue: 0, done: false, order: 1, sync: SYNC() },
    ]);
    await db.goals.add({
      id: "g2",
      title: "هدف مكتمل",
      horizon: "week",
      status: "done",
      sync: SYNC(),
    });

    const snap = await buildSnapshot();
    expect(snap.goals).toHaveLength(1); // only the active one
    expect(snap.goals[0]).toEqual({ id: "g1", title: "قراءة كتاب", pct: 50 });
  });

  it("never throws if the planner input is degenerate", async () => {
    await db.appointments.add({
      id: "a1",
      title: "موعد",
      startAt: "not-a-date",
      endAt: "not-a-date",
      allDay: false,
      reminders: [],
      calendarProviderId: "local",
      sync: SYNC(),
    });
    await expect(buildSnapshot()).resolves.toBeDefined();
  });
});
