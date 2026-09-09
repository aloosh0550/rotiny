"use client";

import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { dailyPlansRepository } from "@/lib/db/repositories";
import { useLocalPlan, useTodayEnergy } from "@/lib/hooks/useLocalPlan";
import { todayKey } from "@/lib/time/dateUtils";
import type { DailyPlan, DailyPlanItem } from "@/lib/types";
import type { LocalPlan } from "@/lib/planner/localPlanner";

function toItems(plan: LocalPlan): DailyPlanItem[] {
  return plan.remaining.map((i, idx) => ({
    refType: i.type,
    refId: i.id,
    bucket: i.bucket,
    order: idx,
    status: "pending",
    reason: i.reason,
  }));
}

/**
 * Persisted plan for today, auto-generated once from the deterministic planner.
 * `plan` is `undefined` while loading, `null` when the day has no plan yet (the
 * generator effect then creates one), or the `DailyPlan`.
 */
export function useDailyPlan(): {
  plan: DailyPlan | null | undefined;
  computed: LocalPlan | undefined;
  regenerate: () => Promise<void>;
} {
  // `?? null` so a missing row (null) is distinguishable from "still loading" (undefined).
  const stored = useLiveQuery(
    async () => (await dailyPlansRepository.getForDate(todayKey())) ?? null,
    [],
  );
  const computed = useLocalPlan();
  const energy = useTodayEnergy();

  useEffect(() => {
    if (stored === undefined || computed === undefined) return; // loading
    if (stored !== null) return; // already have one
    void dailyPlansRepository.upsertForDate(todayKey(), {
      energy: energy ?? null,
      generatedBy: "local",
      items: toItems(computed),
      regeneratedAt: null,
    });
  }, [stored, computed, energy]);

  const regenerate = async () => {
    if (!computed) return;
    await dailyPlansRepository.upsertForDate(todayKey(), {
      energy: energy ?? null,
      generatedBy: "local",
      items: toItems(computed),
      regeneratedAt: new Date().toISOString(),
    });
  };

  return { plan: stored, computed, regenerate };
}
