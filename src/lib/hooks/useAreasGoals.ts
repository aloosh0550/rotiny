"use client";

import { useLiveQuery } from "dexie-react-hooks";
import {
  lifeAreasRepository,
  goalsRepository,
  goalMilestonesRepository,
  measurementsRepository,
} from "@/lib/db/repositories";
import { useTasks } from "@/lib/hooks/useTasks";
import { useHabits } from "@/lib/hooks/useHabits";
import { computeGoalProgress, type GoalProgress } from "@/lib/goals/progress";
import type { Goal, GoalMilestone, LifeArea } from "@/lib/types";

export function useLifeAreas(): LifeArea[] | undefined {
  return useLiveQuery(() => lifeAreasRepository.getAllSorted(), []);
}

export function useLifeArea(id: string | undefined): LifeArea | undefined {
  return useLiveQuery(() => (id ? lifeAreasRepository.getById(id) : undefined), [id]);
}

export function useGoals(): Goal[] | undefined {
  return useLiveQuery(() => goalsRepository.getAll(), []);
}

export function useGoal(id: string | undefined): Goal | undefined {
  return useLiveQuery(() => (id ? goalsRepository.getById(id) : undefined), [id]);
}

export function useGoalMilestones(goalId: string | undefined): GoalMilestone[] | undefined {
  return useLiveQuery(
    () => (goalId ? goalMilestonesRepository.getForGoal(goalId) : []),
    [goalId],
  );
}

/** Real derived progress for one goal (milestones → measurements → tasks). */
export function useGoalProgress(goalId: string | undefined): GoalProgress | undefined {
  const goal = useGoal(goalId);
  const milestones = useGoalMilestones(goalId);
  const tasks = useTasks();
  const habits = useHabits();
  const measuredTotal = useLiveQuery(async () => {
    if (!goalId || !habits) return 0;
    const linkedHabitIds = habits.filter((h) => h.goalId === goalId).map((h) => h.id);
    let total = 0;
    for (const hid of linkedHabitIds) {
      const rows = await measurementsRepository.getForRef("habit", hid);
      total += rows.reduce((s, m) => s + m.value, 0);
    }
    // direct goal measurements too
    const direct = await measurementsRepository.getForRef("goal", goalId);
    total += direct.reduce((s, m) => s + m.value, 0);
    return total;
  }, [goalId, habits]);

  if (!goal || milestones === undefined || !tasks || measuredTotal === undefined) return undefined;
  const linked = tasks.filter((t) => t.goalId === goalId);
  return computeGoalProgress(goal, milestones, linked, measuredTotal);
}
