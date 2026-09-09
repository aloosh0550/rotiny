"use client";

import { useEffect, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/schema";
import {
  reviewsRepository,
  measurementsRepository,
  dhikrProgressRepository,
} from "@/lib/db/repositories";
import { useTasks } from "@/lib/hooks/useTasks";
import { useHabits } from "@/lib/hooks/useHabits";
import { useLifeAreas } from "@/lib/hooks/useAreasGoals";
import { computeReview } from "@/lib/analytics/review";
import { periodKeyFor, previousPeriodKey } from "@/lib/analytics/periods";
import type { ReviewMetrics, ReviewPeriod } from "@/lib/types";

/**
 * The deterministic review for a period (defaults to the current one). Computed
 * live from raw rows and persisted once so it can be revisited later.
 */
export function useReview(
  period: ReviewPeriod,
  key?: string,
): { metrics: ReviewMetrics | undefined; periodKey: string } {
  const periodKey = key ?? periodKeyFor(period);
  const tasks = useTasks();
  const habits = useHabits();
  const lifeAreas = useLifeAreas();
  const completions = useLiveQuery(() => db.habitCompletions.toArray(), []);
  const dhikrProgress = useLiveQuery(() => dhikrProgressRepository.getAll(), []);
  const measurements = useLiveQuery(() => measurementsRepository.getAll(), []);
  const stored = useLiveQuery(async () => (await reviewsRepository.getForPeriod(period, periodKey)) ?? null, [period, periodKey]);
  const prevStored = useLiveQuery(
    async () => (await reviewsRepository.getForPeriod(period, previousPeriodKey(period, periodKey)))?.metrics.completionPct ?? null,
    [period, periodKey],
  );

  const metrics = useMemo(() => {
    if (!tasks || !habits || !lifeAreas || !completions || !dhikrProgress || !measurements) return undefined;
    return computeReview({
      period,
      periodKey,
      tasks,
      habits,
      habitCompletions: completions,
      dhikrProgress,
      measurements,
      lifeAreas,
      previousCompletionPct: prevStored ?? undefined,
    });
  }, [tasks, habits, lifeAreas, completions, dhikrProgress, measurements, period, periodKey, prevStored]);

  // persist / refresh the stored review whenever the computed value changes
  useEffect(() => {
    if (!metrics || stored === undefined) return;
    if (stored && stored.metrics.completionPct === metrics.completionPct && stored.metrics.tasksDone === metrics.tasksDone && stored.metrics.habitsDone === metrics.habitsDone) {
      return;
    }
    void reviewsRepository.upsertForPeriod(period, periodKey, metrics);
  }, [metrics, stored, period, periodKey]);

  return { metrics, periodKey };
}
