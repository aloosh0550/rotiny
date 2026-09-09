import { describe, expect, it } from "vitest";
import { computeGoalProgress } from "@/lib/goals/progress";
import type { Goal, GoalMilestone, Task } from "@/lib/types";

const SYNC = { createdAt: "", updatedAt: "", deletedAt: null, syncStatus: "synced" as const, remoteId: null, version: 1 };

function goal(p: Partial<Goal>): Goal {
  return { id: "g", title: "هدف", horizon: "month", status: "active", sync: SYNC, ...p };
}
function ms(p: Partial<GoalMilestone>): GoalMilestone {
  return { id: "m", goalId: "g", title: "خطوة", currentValue: 0, done: false, order: 0, sync: SYNC, ...p };
}
function task(p: Partial<Task>): Task {
  return { id: "t", title: "مهمة", hasTime: false, priority: "normal", status: "pending", reminders: [], sync: SYNC, ...p };
}

describe("computeGoalProgress", () => {
  it("weighted milestones: sum(current)/sum(target)", () => {
    const p = computeGoalProgress(
      goal({}),
      [ms({ id: "a", targetValue: 10, currentValue: 5 }), ms({ id: "b", targetValue: 10, currentValue: 10 })],
      [],
    );
    expect(p.source).toBe("milestones");
    expect(p.current).toBe(15);
    expect(p.target).toBe(20);
    expect(p.ratio).toBe(0.75);
  });

  it("unweighted milestones: done count", () => {
    const p = computeGoalProgress(
      goal({}),
      [ms({ id: "a", done: true }), ms({ id: "b", done: false }), ms({ id: "c", done: false })],
      [],
    );
    expect(p.ratio).toBeCloseTo(1 / 3);
    expect(p.source).toBe("milestones");
  });

  it("no milestones + targetValue → measured / target", () => {
    const p = computeGoalProgress(goal({ targetValue: 100, targetUnit: "صفحة" }), [], [], 40);
    expect(p.source).toBe("measurements");
    expect(p.current).toBe(40);
    expect(p.ratio).toBe(0.4);
  });

  it("no milestones, no target → linked task completion", () => {
    const p = computeGoalProgress(
      goal({}),
      [],
      [task({ id: "1", status: "completed" }), task({ id: "2", status: "pending" })],
    );
    expect(p.source).toBe("tasks");
    expect(p.ratio).toBe(0.5);
  });

  it("nothing linked → zero", () => {
    const p = computeGoalProgress(goal({}), [], []);
    expect(p).toEqual({ ratio: 0, current: 0, target: 0, source: "none" });
  });

  it("ratio is clamped to [0,1]", () => {
    const p = computeGoalProgress(goal({ targetValue: 10 }), [], [], 25);
    expect(p.ratio).toBe(1);
  });
});
