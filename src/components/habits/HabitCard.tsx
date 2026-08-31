"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Count } from "@/components/ui/Count";
import { StreakBadge } from "./StreakBadge";
import { habitRecurrenceSummary } from "./recurrenceSummary";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";
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
  // Values > 1 get a compact "x / target" tap target instead of a bare checkbox — still
  // a single binary toggle underneath (toggleForDate), just a more informative label.
  const isSteppedTarget = !!target && target.value > 1;

  return (
    <Card padding="md" className="flex items-center gap-3 py-3.5">
      <Link href={ROUTES.habit(habit.id)} className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate text-sm font-semibold text-text-primary" dir="auto">
          {habit.title}
        </p>
        <p className="truncate text-xs text-text-tertiary">{summary}</p>
      </Link>

      <div className="flex shrink-0 items-center gap-2">
        <StreakBadge habit={habit} />
        {dueToday &&
          (isSteppedTarget ? (
            <button
              type="button"
              onClick={onToggle}
              aria-label={t("habits.todayToggleLabel")}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-bold tabular-nums transition-colors duration-150 active:scale-95",
                completedToday
                  ? "border-accent-green/30 bg-accent-green-soft text-accent-green"
                  : "border-border-strong bg-surface text-text-secondary hover:bg-surface-hover",
              )}
            >
              <Count value={completedToday ? target.value : 0} total={target.value} />
              {target.unit && <span className="text-xs font-medium">{target.unit}</span>}
            </button>
          ) : (
            <Checkbox
              size="md"
              checked={completedToday}
              onCheckedChange={onToggle}
              label={t("habits.todayToggleLabel")}
            />
          ))}
      </div>
    </Card>
  );
}
