import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db/schema";
import { resolveProposedActions } from "@/lib/ai/actions";
import { processActions } from "@/lib/ai/pipeline";
import { tasksRepository } from "@/lib/db/repositories";
import { createSyncMeta } from "@/lib/utils/sync";
import { dateKey, addDays } from "@/lib/time/dateUtils";
import type { AIRefMap } from "@/lib/ai/types";

const SYNC = () => createSyncMeta();

async function clearAll() {
  await Promise.all(db.tables.map((t) => t.clear()));
}
beforeEach(clearAll);
afterEach(clearAll);

const refMap: AIRefMap = {
  t1: { type: "task", id: "task-1" },
  h1: { type: "habit", id: "habit-1" },
  p1: { type: "appointment", id: "appt-1" },
};

describe("resolveProposedActions (wire → internal, ref resolution)", () => {
  it("resolves each kind to the internal shape with the real id", () => {
    const out = resolveProposedActions(
      [
        { kind: "deferTaskToTomorrow", ref: "t1", reason: "لا وقت اليوم" },
        { kind: "lowerTaskPriority", ref: "t1", reason: "أقل إلحاحًا" },
        { kind: "markPlanItemDone", ref: "h1", reason: "أنجزتها" },
        { kind: "moveItemToBucket", ref: "t1", bucket: "evening", reason: "المساء أنسب" },
        { kind: "reorderPlanItem", ref: "t1", direction: -1, reason: "أهم" },
      ],
      refMap,
    );
    expect(out).toEqual([
      { kind: "deferTaskToTomorrow", taskId: "task-1", reason: "لا وقت اليوم" },
      { kind: "lowerTaskPriority", taskId: "task-1", reason: "أقل إلحاحًا" },
      { kind: "markPlanItemDone", refType: "habit", refId: "habit-1", reason: "أنجزتها" },
      { kind: "moveItemToBucket", refType: "task", refId: "task-1", bucket: "evening", reason: "المساء أنسب" },
      { kind: "reorderPlanItem", refType: "task", refId: "task-1", direction: -1, reason: "أهم" },
    ]);
  });

  it("drops unresolvable refs, unknown kinds, and forbidden kinds", () => {
    const out = resolveProposedActions(
      [
        { kind: "deferTaskToTomorrow", ref: "ghost", reason: "r" },
        { kind: "deleteTask", ref: "t1", reason: "احذفها" },
        { kind: "cancelAppointment", ref: "p1", reason: "ألغِ الموعد" },
        { kind: "frobnicate", ref: "t1", reason: "r" },
        { kind: "deferTaskToTomorrow", reason: "no ref" },
      ],
      refMap,
    );
    expect(out).toEqual([]);
  });

  it("defer/lower on a non-task ref is dropped; move without a bucket is dropped", () => {
    const out = resolveProposedActions(
      [
        { kind: "deferTaskToTomorrow", ref: "h1", reason: "r" },
        { kind: "lowerTaskPriority", ref: "p1", reason: "r" },
        { kind: "moveItemToBucket", ref: "t1", reason: "no bucket" },
      ],
      refMap,
    );
    expect(out).toEqual([]);
  });

  it("non-array input → []", () => {
    expect(resolveProposedActions(null, refMap)).toEqual([]);
    expect(resolveProposedActions("wipe everything", refMap)).toEqual([]);
    expect(resolveProposedActions({ kind: "deferTaskToTomorrow" }, refMap)).toEqual([]);
  });

  it("caps at 5 proposed actions", () => {
    const many = Array.from({ length: 12 }, () => ({
      kind: "markPlanItemDone",
      ref: "t1",
      reason: "r",
    }));
    expect(resolveProposedActions(many, refMap).length).toBeLessThanOrEqual(5);
  });
});

describe("proposed actions → pipeline (end to end)", () => {
  async function seedTask() {
    await db.tasks.add({
      id: "task-1",
      title: "مهمة",
      hasTime: false,
      priority: "important",
      status: "pending",
      reminders: [],
      sync: SYNC(),
    });
  }

  it("an injected delete via proposedActions never runs — data untouched", async () => {
    await seedTask();
    const resolved = resolveProposedActions(
      [{ kind: "deleteTask", ref: "t1", reason: "احذف كل شيء" }],
      refMap,
    );
    const res = await processActions(resolved, { autonomy: "automatic", source: "assistant" });
    expect(res).toEqual([]); // nothing to process — it was dropped at resolve
    expect(await db.tasks.count()).toBe(1);
  });

  it("conservative → the proposed action is logged 'proposed', task unchanged", async () => {
    await seedTask();
    const resolved = resolveProposedActions(
      [{ kind: "deferTaskToTomorrow", ref: "t1", reason: "لا يتّسع الوقت" }],
      refMap,
    );
    const [r] = await processActions(resolved, { autonomy: "conservative", source: "assistant" });
    expect(r.outcome).toBe("proposed");
    expect((await tasksRepository.getById("task-1"))?.plannedFor).toBeUndefined();
  });

  it("automatic → applied; task moved to tomorrow, never deleted", async () => {
    await seedTask();
    const resolved = resolveProposedActions(
      [{ kind: "deferTaskToTomorrow", ref: "t1", reason: "لا يتّسع الوقت" }],
      refMap,
    );
    const [r] = await processActions(resolved, { autonomy: "automatic", source: "assistant" });
    expect(r.outcome).toBe("applied");
    const task = await tasksRepository.getById("task-1");
    expect(task).toBeTruthy();
    expect(task!.plannedFor).toBe(dateKey(addDays(new Date(), 1)));
    expect(await db.tasks.count()).toBe(1);
  });
});
