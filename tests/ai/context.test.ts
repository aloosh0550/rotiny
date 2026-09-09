import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db/schema";
import { buildAIContext } from "@/lib/ai/context";
import { renderContext } from "@/lib/ai/personas";
import { createSyncMeta } from "@/lib/utils/sync";
import { todayKey } from "@/lib/time/dateUtils";

const SYNC = () => createSyncMeta();
async function clearAll() {
  await Promise.all(db.tables.map((t) => t.clear()));
}
beforeEach(clearAll);
afterEach(clearAll);

describe("buildAIContext — refs + privacy", () => {
  it("gives every task/habit an opaque ref that maps back to the real id", async () => {
    await db.tasks.bulkAdd([
      { id: "uuid-task-a", title: "أ", hasTime: false, priority: "important", status: "pending", reminders: [], sync: SYNC() },
      { id: "uuid-task-b", title: "ب", hasTime: false, priority: "normal", status: "pending", reminders: [], sync: SYNC() },
    ]);
    await db.habits.add({
      id: "uuid-habit-x",
      title: "قراءة",
      recurrence: { frequency: "daily", interval: 1 },
      reminders: [],
      sync: SYNC(),
    });

    const { context, refMap } = await buildAIContext({ includeMemory: false });

    expect(context.tasks.map((t) => t.ref)).toEqual(["t1", "t2"]);
    expect(context.habits[0].ref).toBe("h1");
    expect(refMap.t1).toEqual({ type: "task", id: "uuid-task-a" });
    expect(refMap.t2).toEqual({ type: "task", id: "uuid-task-b" });
    expect(refMap.h1).toEqual({ type: "habit", id: "uuid-habit-x" });
  });

  it("the rendered context contains titles + refs but NEVER a real row id", async () => {
    await db.tasks.add({
      id: "3f8c1a90-secret-uuid-0000",
      title: "مراجعة العقد",
      hasTime: false,
      priority: "important",
      status: "pending",
      reminders: [],
      sync: SYNC(),
    });
    await db.dailyEnergy.add({ id: `local:${todayKey()}`, date: todayKey(), level: "low", sync: SYNC() });

    const { context } = await buildAIContext({ includeMemory: false });
    const rendered = renderContext(context, "ar");

    expect(rendered).toContain("[t1]");
    expect(rendered).toContain("مراجعة العقد");
    expect(rendered).toContain("low");
    expect(rendered).not.toContain("3f8c1a90");
    expect(rendered).not.toContain("secret-uuid");
  });

  it("memory is only included when asked", async () => {
    await db.aiMemory.add({
      id: "m1",
      kind: "preference",
      text: "يفضّل الصباح",
      source: "assistant",
      enabled: true,
      confidence: null,
      sync: SYNC(),
    });
    const without = await buildAIContext({ includeMemory: false });
    expect(without.context.memory).toEqual([]);
    const withMem = await buildAIContext({ includeMemory: true });
    expect(withMem.context.memory).toEqual(["يفضّل الصباح"]);
  });
});
