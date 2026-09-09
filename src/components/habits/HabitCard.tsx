"use client";

import Link from "next/link";
import { Minus, Plus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { ProgressMeter } from "@/components/ui/ProgressMeter";
import { StreakBadge } from "./StreakBadge";
import { habitRecurrenceSummary } from "./recurrenceSummary";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useMeasurement } from "@/lib/hooks/useMeasurements";
import { adjustHabitProgress } from "@/lib/trackers/habitProgress";
import { ROUTES } from "@/lib/constants/routes";
import type { Habit } from "@/lib/types";

export interface HabitCardProps {
  habit: Habit;
  dueToday: boolean;
  completedToday: boolean;
  onToggle: () => void;
}

export function HabitCard({ habit, dueToday, completedToday, onToggle }: HabitCardProps) {
  const { t, locale } = useTranslation();
  const summary = habitRecurrenceSummary(habit, t, locale);
  const target = habit.target;
  const measured = useMeasurement("habit", habit.id);
  // A count/duration target > 1 tracks a real per-day value the user steps.
  const isMeasured = !!target && target.value > 1;
  const value = measured ?? (completedToday && target ? target.value : 0);

  return (
    <Card padding="md" className="flex flex-col gap-2.5 py-3.5">
      <div className="flex items-center gap-3">
        <Link href={ROUTES.habit(habit.id)} className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="truncate text-sm font-semibold text-text-primary" dir="auto">
            {habit.title}
          </p>
          <p className="truncate text-xs text-text-tertiary">{summary}</p>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <StreakBadge habit={habit} />
          {dueToday && !isMeasured && (
            <Checkbox
              size="md"
              checked={completedToday}
              onCheckedChange={onToggle}
              label={t("habits.todayToggleLabel")}
            />
          )}
        </div>
      </div>

      {dueToday && isMeasured && target && (
        <div className="flex items-center gap-3">
          <ProgressMeter
            className="flex-1"
            size="sm"
            current={value}
            target={target.value}
            unit={target.unit ?? (target.type === "duration" ? t("common.minutes") : undefined)}
          />
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              aria-label={t("trackers.decrement")}
              disabled={value <= 0}
              onClick={() => void adjustHabitProgress(habit, target.type === "duration" ? -5 : -1)}
              className="flex size-8 items-center justify-center rounded-lg border border-border text-text-secondary disabled:opacity-30"
            >
              <Minus className="size-4" />
            </button>
            <button
              type="button"
              aria-label={t("trackers.increment")}
              onClick={() => void adjustHabitProgress(habit, target.type === "duration" ? 5 : 1)}
              className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-ink"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
