import type { Goal, GoalMilestone, Task } from "@/lib/types";

export type GoalProgressSource = "milestones" | "measurements" | "tasks" | "none";

export interface GoalProgress {
  ratio: number; // 0..1
  current: number;
  target: number;
  source: GoalProgressSource;
}

/**
 * Real, derived goal progress — never a manually-typed number. Precedence:
 *   1. milestones      — weighted by targetValue when set, else done-count
 *   2. measurements    — cumulative measured value toward `goal.targetValue`
 *   3. linked tasks    — completed / total
 *   4. none            — 0
 */
export function computeGoalProgress(
  goal: Goal,
  milestones: GoalMilestone[],
  linkedTasks: Task[],
  measuredTotal = 0,
): GoalProgress {
  const clamp = (r: number) => Math.max(0, Math.min(1, r));

  if (milestones.length > 0) {
    const weighted = milestones.some((m) => (m.targetValue ?? 0) > 0);
    if (weighted) {
      const target = milestones.reduce((s, m) => s + Math.max(0, m.targetValue ?? 0), 0);
      const current = milestones.reduce(
        (s, m) => s + Math.min(Math.max(0, m.currentValue), Math.max(0, m.targetValue ?? 0)),
        0,
      );
      return { current, target, ratio: target > 0 ? clamp(current / target) : 0, source: "milestones" };
    }
    const done = milestones.filter((m) => m.done).length;
    return {
      current: done,
      target: milestones.length,
      ratio: clamp(done / milestones.length),
      source: "milestones",
    };
  }

  if ((goal.targetValue ?? 0) > 0) {
    const target = goal.targetValue as number;
    return { current: measuredTotal, target, ratio: clamp(measuredTotal / target), source: "measurements" };
  }

  if (linkedTasks.length > 0) {
    const done = linkedTasks.filter((t) => t.status === "completed").length;
    return {
      current: done,
      target: linkedTasks.length,
      ratio: clamp(done / linkedTasks.length),
      source: "tasks",
    };
  }

  return { current: 0, target: 0, ratio: 0, source: "none" };
}
