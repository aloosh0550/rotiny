import { describe, expect, it } from "vitest";
import { AI_ACTION_KINDS, isForbiddenActionKind, parseAiAction } from "@/lib/ai/actions";
import { decideAction, autoApplies } from "@/lib/ai/policy";
import type { AiAutonomy } from "@/lib/types";

const LEVELS: AiAutonomy[] = ["conservative", "balanced", "automatic"];

describe("autonomy policy", () => {
  it("conservative proposes every action — nothing auto-applies", () => {
    for (const kind of AI_ACTION_KINDS) {
      expect(decideAction(kind, "conservative")).toBe("confirm");
      expect(autoApplies(kind, "conservative")).toBe(false);
    }
  });

  it("balanced auto-applies only the trivial reversible steps", () => {
    expect(decideAction("reorderPlanItem", "balanced")).toBe("auto");
    expect(decideAction("markPlanItemDone", "balanced")).toBe("auto");
    // structural moves still ask
    expect(decideAction("moveItemToBucket", "balanced")).toBe("confirm");
    expect(decideAction("deferTaskToTomorrow", "balanced")).toBe("confirm");
    expect(decideAction("lowerTaskPriority", "balanced")).toBe("confirm");
  });

  it("automatic auto-applies every planning action", () => {
    for (const kind of AI_ACTION_KINDS) {
      expect(decideAction(kind, "automatic")).toBe("auto");
    }
  });

  it("autonomy strictly widens what auto-applies (conservative ⊆ balanced ⊆ automatic)", () => {
    for (const kind of AI_ACTION_KINDS) {
      const seq = LEVELS.map((l) => autoApplies(kind, l));
      // once true, stays true
      for (let i = 1; i < seq.length; i++) {
        if (seq[i - 1]) expect(seq[i]).toBe(true);
      }
    }
  });

  it("delete / cancel / appointment-mutation kinds are forbidden at every level", () => {
    for (const bad of ["deleteTask", "removeHabit", "cancelAppointment", "moveAppointment", "dropGoal"]) {
      expect(isForbiddenActionKind(bad)).toBe(true);
      for (const l of LEVELS) expect(decideAction(bad, l)).toBe("forbidden");
    }
  });

  it("unknown kinds are forbidden, not silently auto", () => {
    for (const l of LEVELS) expect(decideAction("frobnicate", l)).toBe("forbidden");
  });

  it("parseAiAction rejects forbidden kinds and malformed payloads", () => {
    expect(parseAiAction({ kind: "deleteTask", taskId: "x", reason: "r" })).toBeNull();
    expect(parseAiAction({ kind: "reorderPlanItem" })).toBeNull(); // missing fields
    expect(parseAiAction({ kind: "reorderPlanItem", refType: "task", refId: "t1", direction: 2, reason: "r" })).toBeNull();
    expect(
      parseAiAction({ kind: "reorderPlanItem", refType: "task", refId: "t1", direction: -1, reason: "لأنها أهم" }),
    ).toMatchObject({ kind: "reorderPlanItem", direction: -1 });
  });
});
