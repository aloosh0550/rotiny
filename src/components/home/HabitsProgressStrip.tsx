"use client";

import { Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useHabits, useCompletionsForDate } from "@/lib/hooks/useHabits";
import { habitCompletionsRepository } from "@/lib/db/repositories";
import { todayKey } from "@/lib/time/dateUtils";
import { isDueOnDate } from "@/lib/time/recurrence";
import { cn } from "@/lib/utils/cn";

export function HabitsProgressStrip() {
  const { t } = useTranslation();
  const habits = useHabits();
  const today = todayKey();
  const completions = useCompletionsForDate(today);

  const dueToday = habits?.filter((h) => isDueOnDate(h.recurrence, new Date(h.sync.createdAt), new Date()));
  const completedIds = new Set(completions?.map((c) => c.habitId));

  return (
    <section className="flex flex-col gap-2 px-4">
      <h3 className="text-sm font-semibold text-text-secondary">{t("home.habitsProgress")}</h3>
      {!habits || !completions ? (
        <Card className="h-16 animate-pulse" />
      ) : dueToday && dueToday.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {dueToday.map((habit) => {
            const done = completedIds.has(habit.id);
            return (
              <button
                key={habit.id}
                type="button"
                onClick={() => void habitCompletionsRepository.toggleForDate(habit.id, today)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium transition-colors duration-150",
                  done
                    ? "border-success/30 bg-success/10 text-success"
                    : "border-border bg-surface text-text-secondary hover:bg-surface-hover",
                )}
              >
                <span
                  className={cn(
                    "flex size-4 items-center justify-center rounded-full border",
                    done ? "border-success bg-success text-white" : "border-border-strong",
                  )}
                >
                  {done && <Check className="size-2.5" strokeWidth={3} />}
                </span>
                {habit.title}
              </button>
            );
          })}
        </div>
      ) : (
        <EmptyState title={t("home.allHabitsDone")} />
      )}
    </section>
  );
}
