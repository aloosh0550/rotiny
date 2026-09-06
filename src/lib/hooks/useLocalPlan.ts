"use client";

import { useMemo } from "react";
import { useTasks } from "@/lib/hooks/useTasks";
import { useAppointments } from "@/lib/hooks/useAppointments";
import { useHabits, useCompletionsForDate } from "@/lib/hooks/useHabits";
import { useNow } from "@/lib/hooks/useNow";
import { useSettings } from "@/lib/hooks/useSettings";
import { todayKey } from "@/lib/time/dateUtils";
import { buildLocalPlan, type LocalPlan, type EnergyLevel } from "@/lib/planner/localPlanner";

/**
 * The deterministic day plan ("المخطط الذكي"), recomputed from live local data.
 * No network, no AI. `undefined` until the underlying queries resolve.
 *
 * `energy` is read from settings for now (a dedicated daily check-in store lands
 * in a later phase); pass an override to preview a different level.
 */
export function useLocalPlan(energyOverride?: EnergyLevel | null): LocalPlan | undefined {
  const tasks = useTasks();
  const appointments = useAppointments();
  const habits = useHabits();
  const habitCompletions = useCompletionsForDate(todayKey());
  const settings = useSettings();
  const now = useNow(60_000);

  return useMemo(() => {
    if (!tasks || !appointments || !habits || !habitCompletions) return undefined;
    const energy =
      energyOverride ??
      ((settings as { dailyEnergy?: EnergyLevel } | undefined)?.dailyEnergy ?? null);
    return buildLocalPlan({
      now,
      energy,
      tasks,
      appointments,
      habits,
      habitCompletions,
    });
  }, [tasks, appointments, habits, habitCompletions, settings, now, energyOverride]);
}
