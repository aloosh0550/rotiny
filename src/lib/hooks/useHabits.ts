"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { habitCompletionsRepository, habitsRepository } from "@/lib/db/repositories";
import type { Habit, HabitCompletion } from "@/lib/types";

export function useHabits(): Habit[] | undefined {
  return useLiveQuery(() => habitsRepository.getActive(), []);
}

export function useHabit(id: string | undefined): Habit | undefined {
  return useLiveQuery(() => (id ? habitsRepository.getById(id) : undefined), [id]);
}

export function useHabitCompletions(habitId: string | undefined): HabitCompletion[] | undefined {
  return useLiveQuery(
    () => (habitId ? habitCompletionsRepository.getForHabit(habitId) : []),
    [habitId],
  );
}

export function useCompletionsForDate(date: string): HabitCompletion[] | undefined {
  return useLiveQuery(() => habitCompletionsRepository.getForDate(date), [date]);
}
