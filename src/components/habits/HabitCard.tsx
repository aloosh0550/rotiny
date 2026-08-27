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
    <Card padding="md" className="flex items-center gap-3">
      <Link href={ROUTES.habit(habit.id)} className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="truncate text-sm font-semibold text-text-primary">{habit.title}</p>
          <p className="truncate text-xs text-text-tertiary">{summary}</p>
        </div>
        <StreakBadge habit={habit} />
      </Link>

      {dueToday && (
        <div className="shrink-0">
          {isSteppedTarget ? (
            <button
              type="button"
              onClick={onToggle}
              aria-label={t("habits.todayToggleLabel")}
              className={cn(
                "flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors duration-150",
                completedToday
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-border bg-surface text-text-secondary hover:bg-surface-hover",
              )}
            >
              <Count value={completedToday ? target.value : 0} total={target.value} />
              {target.unit && <span className="font-normal">{target.unit}</span>}
            </button>
          ) : (
            <Checkbox
              checked={completedToday}
              onCheckedChange={onToggle}
              label={t("habits.todayToggleLabel")}
            />
          )}
        </div>
      )}
    </Card>
  );
}
