"use client";

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useTasks } from "@/lib/hooks/useTasks";
import { useAppointments } from "@/lib/hooks/useAppointments";
import { useHabits, useCompletionsForDate } from "@/lib/hooks/useHabits";
import { useNow } from "@/lib/hooks/useNow";
import { dailyEnergyRepository } from "@/lib/db/repositories";
import { todayKey } from "@/lib/time/dateUtils";
import { buildLocalPlan, type LocalPlan, type EnergyLevel } from "@/lib/planner/localPlanner";

/** Today's self-reported energy (from the morning check-in). `undefined` while
 * loading, `null` when not answered, else the level. */
export function useTodayEnergy(): EnergyLevel | null | undefined {
  return useLiveQuery(
    async () => (await dailyEnergyRepository.getForDate(todayKey()))?.level ?? null,
    [],
  );
}

/**
 * The deterministic day plan ("المخطط الذكي"), recomputed from live local data
 * + today's energy check-in. No network, no AI. `undefined` until queries resolve.
 */
export function useLocalPlan(energyOverride?: EnergyLevel | null): LocalPlan | undefined {
  const tasks = useTasks();
  const appointments = useAppointments();
  const habits = useHabits();
  const habitCompletions = useCompletionsForDate(todayKey());
  const energy = useTodayEnergy();
  const now = useNow(60_000);

  return useMemo(() => {
    if (!tasks || !appointments || !habits || !habitCompletions || energy === undefined) {
      return undefined;
    }
    return buildLocalPlan({
      now,
      energy: energyOverride ?? energy,
      tasks,
      appointments,
      habits,
      habitCompletions,
    });
  }, [tasks, appointments, habits, habitCompletions, energy, now, energyOverride]);
}
