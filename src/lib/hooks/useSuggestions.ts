"use client";

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/schema";
import { dailyPlansRepository, dailyEnergyRepository, goalsRepository } from "@/lib/db/repositories";
import { useTasks } from "@/lib/hooks/useTasks";
import { useHabits } from "@/lib/hooks/useHabits";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { todayKey } from "@/lib/time/dateUtils";
import { computeSuggestions, type Suggestion } from "@/lib/ai/suggestions";

/**
 * Deterministic, data-driven suggestions. Works with AI off — nothing here calls
 * a model or the network.
 */
export function useSuggestions(): Suggestion[] | undefined {
  const { locale } = useTranslation();
  const today = todayKey();
  const tasks = useTasks();
  const habits = useHabits();
  const completions = useLiveQuery(() => db.habitCompletions.toArray(), []);
  const goals = useLiveQuery(() => goalsRepository.getAll(), []);
  const energy = useLiveQuery(async () => (await dailyEnergyRepository.getForDate(today)) ?? null, [today]);
  const plan = useLiveQuery(async () => (await dailyPlansRepository.getForDate(today)) ?? null, [today]);

  return useMemo(() => {
    if (
      !tasks ||
      !habits ||
      !completions ||
      !goals ||
      energy === undefined ||
      plan === undefined
    ) {
      return undefined;
    }
    return computeSuggestions({
      today,
      locale,
      tasks,
      habits,
      habitCompletions: completions,
      energyLoggedToday: energy !== null,
      hasPlanToday: plan !== null,
      goals,
    });
  }, [tasks, habits, completions, goals, energy, plan, today, locale]);
}
