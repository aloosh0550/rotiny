"use client";

import { Flame } from "lucide-react";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useHabitCompletions } from "@/lib/hooks/useHabits";
import { useNow } from "@/lib/hooks/useNow";
import { computeHabitStats } from "@/lib/time/streak";
import { cn } from "@/lib/utils/cn";
import type { Habit } from "@/lib/types";

export interface StreakBadgeProps {
  habit: Habit;
}

/** Restrained streak indicator: a muted pill when there's no run going, and a warm
 * accent-filled flame + count the moment a streak exists — legible at a glance,
 * no levels or badges to chase. */
export function StreakBadge({ habit }: StreakBadgeProps) {
  const completions = useHabitCompletions(habit.id);
  const now = useNow();
  const { t } = useTranslation();

  if (!completions) {
    return <div className="h-6 w-12 shrink-0 animate-pulse rounded-full bg-surface-hover" />;
  }

  const stats = computeHabitStats(habit.recurrence, new Date(habit.sync.createdAt), completions, now);
  const active = stats.current > 0;

  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 tabular-nums",
        active ? "bg-warning/12 text-warning" : "bg-surface-hover text-text-tertiary",
      )}
      title={t("habits.streakDays", { count: stats.current })}
    >
      <Flame className="size-3.5" strokeWidth={2.25} fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.22 : 0} />
      <span className="text-sm font-bold">{stats.current}</span>
    </div>
  );
}
