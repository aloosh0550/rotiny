"use client";

import { HabitCard } from "./HabitCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { useCompletionsForDate } from "@/lib/hooks/useHabits";
import { useNow } from "@/lib/hooks/useNow";
import { habitCompletionsRepository } from "@/lib/db/repositories";
import { todayKey } from "@/lib/time/dateUtils";
import { isDueOnDate } from "@/lib/time/recurrence";
import type { Habit } from "@/lib/types";

export interface HabitListProps {
  habits: Habit[];
}

export function HabitList({ habits }: HabitListProps) {
  const today = todayKey();
  const now = useNow();
  const completions = useCompletionsForDate(today);

  if (!completions) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  const completedIds = new Set(completions.map((c) => c.habitId));

  return (
    <div className="flex flex-col gap-3">
      {habits.map((habit) => (
        <HabitCard
          key={habit.id}
          habit={habit}
          dueToday={isDueOnDate(habit.recurrence, new Date(habit.sync.createdAt), now)}
          completedToday={completedIds.has(habit.id)}
          onToggle={() => void habitCompletionsRepository.toggleForDate(habit.id, today)}
        />
      ))}
    </div>
  );
}
