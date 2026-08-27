"use client";

import { addDays } from "date-fns";
import { startOfWeek, dateKey, formatMonthDay } from "@/lib/time/dateUtils";
import { useNow } from "@/lib/hooks/useNow";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils/cn";
import type { Habit, HabitCompletion } from "@/lib/types";

const WEEKS = 12;
const TOTAL_DAYS = WEEKS * 7;

export interface HabitHistoryGridProps {
  habit: Habit;
  completions: HabitCompletion[];
}

/** Restrained single-hue heat-grid of the last ~12 weeks: one square per day,
 * tinted if a completion exists for that date, outlined otherwise. */
export function HabitHistoryGrid({ completions }: HabitHistoryGridProps) {
  const now = useNow();
  const { locale } = useTranslation();
  const completedSet = new Set(completions.map((c) => c.date));
  const gridStart = startOfWeek(addDays(now, -(TOTAL_DAYS - 1)), 0);

  const cells = Array.from({ length: TOTAL_DAYS }, (_, i) => {
    const date = addDays(gridStart, i);
    return { key: dateKey(date), date, done: completedSet.has(dateKey(date)), future: date > now };
  });

  return (
    // Heat-grids read chronologically regardless of text direction (same rationale as
    // calendars), so this is deliberately isolated as LTR even under an RTL locale.
    <div
      dir="ltr"
      className="grid w-max gap-1"
      style={{ gridTemplateRows: "repeat(7, 13px)", gridAutoFlow: "column" }}
    >
      {cells.map((cell) => (
        <div
          key={cell.key}
          title={cell.future ? undefined : formatMonthDay(cell.date, locale)}
          className={cn(
            "size-[13px] rounded-[4px]",
            cell.future
              ? "bg-transparent"
              : cell.done
                ? "bg-accent-green"
                : "bg-surface-sunken",
          )}
        />
      ))}
    </div>
  );
}
