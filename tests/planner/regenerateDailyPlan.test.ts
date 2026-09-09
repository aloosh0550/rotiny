import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db/schema";
import { regenerateDailyPlan } from "@/lib/planner/aiPlan";
import { dailyPlansRepository } from "@/lib/db/repositories";
import { createSyncMeta } from "@/lib/utils/sync";
import { todayKey } from "@/lib/time/dateUtils";
import type { AiSettings, Task } from "@/lib/types";
import type { AIProvider } from "@/lib/ai/types";

const SYNC = () => createSyncMeta();
async function clearAll() {
  await Promise.all(db.tables.map((t) => t.clear()));
}
beforeEach(clearAll);
afterEach(clearAll);

const AI: AiSettings = {
  enabled: true,
  provider: "gemini",
  assistantName: "ر",
  personality: "supportive",
  autonomy: "conservative",
  memoryEnabled: true,
  shareContext: true,
};

const input = () => ({
  now: new Date("2026-09-07T09:00:00"),
  energy: null,
  tasks: [
    { id: "a", title: "أ", hasTime: false, priority: "later", status: "pending", reminders: [], sync: SYNC() },
    { id: "b", title: "ب", hasTime: false, priority: "important", status: "pending", reminders: [], sync: SYNC() },
  ] as Task[],
  appointments: [],
  habits: [],
  habitCompletions: [],
});

const provider = (plan?: AIProvider["plan"]): AIProvider => ({
  id: "gemini",
  isConfigured: () => true,
  chat: vi.fn(),
  plan,
});

describe("regenerateDailyPlan", () => {
  it("persists an AI-ordered plan with generatedBy 'ai' on success", async () => {
    await regenerateDailyPlan(input(), {
      ai: AI,
      provider: provider(vi.fn().mockResolvedValue({ order: ["a", "b"] })),
      accessToken: "jwt",
      locale: "ar",
    });
    const saved = await dailyPlansRepository.getForDate(todayKey());
    expect(saved?.generatedBy).toBe("ai");
    expect(saved?.items.map((i) => i.refId)).toEqual(["a", "b"]);
    expect(saved?.regeneratedAt).toBeTruthy();
  });

  it("falls back to the deterministic order + generatedBy 'local' when AI throws", async () => {
    await regenerateDailyPlan(input(), {
      ai: AI,
      provider: provider(vi.fn().mockRejectedValue(new Error("offline"))),
      accessToken: null,
      locale: "ar",
    });
    const saved = await dailyPlansRepository.getForDate(todayKey());
    expect(saved?.generatedBy).toBe("local");
    // deterministic: important 'b' before 'later' 'a'
    expect(saved?.items[0].refId).toBe("b");
  });

  it("AI disabled → local, no provider call", async () => {
    const planFn = vi.fn();
    await regenerateDailyPlan(input(), {
      ai: { ...AI, enabled: false },
      provider: provider(planFn),
      accessToken: null,
      locale: "ar",
    });
    expect(planFn).not.toHaveBeenCalled();
    expect((await dailyPlansRepository.getForDate(todayKey()))?.generatedBy).toBe("local");
  });
});
