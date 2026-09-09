import { describe, expect, it, vi } from "vitest";
import { computePlan } from "@/lib/planner/aiPlan";
import type { AiSettings, Task } from "@/lib/types";
import type { AIProvider } from "@/lib/ai/types";

const SYNC = {
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  deletedAt: null,
  syncStatus: "synced" as const,
  remoteId: null,
  version: 1,
};
const task = (p: Partial<Task>): Task => ({
  id: p.id ?? "t",
  title: p.title ?? "مهمة",
  hasTime: false,
  priority: "normal",
  status: "pending",
  reminders: [],
  sync: SYNC,
  ...p,
});

const input = () => ({
  now: new Date("2026-09-07T09:00:00"),
  energy: null,
  tasks: [task({ id: "a", priority: "later" }), task({ id: "b", priority: "important" })],
  appointments: [],
  habits: [],
  habitCompletions: [],
});

const AI_ON: AiSettings = {
  enabled: true,
  provider: "gemini",
  assistantName: "رفيق",
  personality: "supportive",
  autonomy: "conservative",
  memoryEnabled: true,
  shareContext: true,
};

function providerWith(planImpl?: AIProvider["plan"]): AIProvider {
  return {
    id: "gemini",
    isConfigured: () => true,
    chat: vi.fn(),
    plan: planImpl,
  };
}

describe("computePlan — AI upgrade with deterministic fallback", () => {
  it("AI disabled → deterministic order, source 'local'", async () => {
    const r = await computePlan(input(), {
      ai: { ...AI_ON, enabled: false },
      provider: providerWith(vi.fn()),
      accessToken: null,
      locale: "ar",
    });
    expect(r.source).toBe("local");
    // deterministic: important 'b' outranks 'later' 'a'
    expect(r.items[0].refId).toBe("b");
  });

  it("provider without plan support → local, no call", async () => {
    const r = await computePlan(input(), {
      ai: AI_ON,
      provider: providerWith(undefined),
      accessToken: null,
      locale: "ar",
    });
    expect(r.source).toBe("local");
  });

  it("provider.plan throws (offline/quota) → silent fallback to local", async () => {
    const r = await computePlan(input(), {
      ai: AI_ON,
      provider: providerWith(vi.fn().mockRejectedValue(new Error("network"))),
      accessToken: null,
      locale: "ar",
    });
    expect(r.source).toBe("local");
    expect(r.fellBack).toBe(true);
    expect(r.items.map((i) => i.refId).sort()).toEqual(["a", "b"]);
  });

  it("valid AI order → items reordered, reasons overridden, source 'ai'", async () => {
    const r = await computePlan(input(), {
      ai: AI_ON,
      provider: providerWith(
        vi.fn().mockResolvedValue({ order: ["a", "b"], reasons: { a: "ابدأ بها لتفرغ ذهنك" } }),
      ),
      accessToken: "jwt",
      locale: "ar",
    });
    expect(r.source).toBe("ai");
    expect(r.items.map((i) => i.refId)).toEqual(["a", "b"]);
    expect(r.items[0].reason).toBe("ابدأ بها لتفرغ ذهنك");
  });

  it("AI drops/garbles ids → dropped candidates re-appended in local order", async () => {
    const r = await computePlan(input(), {
      ai: AI_ON,
      provider: providerWith(vi.fn().mockResolvedValue({ order: ["b", "ghost-id"] })),
      accessToken: "jwt",
      locale: "ar",
    });
    expect(r.source).toBe("ai");
    expect(r.items.map((i) => i.refId)).toEqual(["b", "a"]); // 'a' kept, ghost ignored
  });
});
