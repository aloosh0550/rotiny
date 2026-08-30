"use client";

import { Check } from "lucide-react";
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

  const dueToday = habits?.filter((h) =>
    isDueOnDate(h.recurrence, new Date(h.sync.createdAt), new Date()),
  );
  const completedIds = new Set(completions?.map((c) => c.habitId));

  return (
    <section className="flex flex-col gap-2 px-4 md:px-0">
      <h3 className="text-[13px] font-semibold text-text-secondary">{t("home.habitsProgress")}</h3>
      {!habits || !completions ? (
        <div className="h-12 skeleton rounded-full" />
      ) : dueToday && dueToday.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {dueToday.map((habit) => {
            const done = completedIds.has(habit.id);
            return (
              <button
                key={habit.id}
                type="button"
                onClick={() => void habitCompletionsRepository.toggleForDate(habit.id, today)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors duration-150 active:scale-95",
                  done
                    ? "border-accent-green/30 bg-accent-green-soft text-accent-green"
                    : "border-border bg-surface text-text-secondary hover:bg-surface-hover",
                )}
              >
                <span
                  className={cn(
                    "flex size-4 items-center justify-center rounded-full border transition-colors",
                    done
                      ? "border-accent-green bg-accent-green text-accent-green-ink"
                      : "border-border-strong",
                  )}
                >
                  {done && <Check className="size-2.5" strokeWidth={3.5} />}
                </span>
                {habit.title}
              </button>
            );
          })}
        </div>
      ) : (
        <EmptyState compact icon={<Check />} title={t("home.allHabitsDone")} />
      )}
    </section>
  );
}
