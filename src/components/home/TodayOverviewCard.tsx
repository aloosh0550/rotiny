"use client";

import { Card } from "@/components/ui/Card";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useAppointments } from "@/lib/hooks/useAppointments";
import { useTasks } from "@/lib/hooks/useTasks";
import { useHabits, useCompletionsForDate } from "@/lib/hooks/useHabits";
import { useNow } from "@/lib/hooks/useNow";
import { todayKey } from "@/lib/time/dateUtils";
import { isDueOnDate } from "@/lib/time/recurrence";
import { isSameDay } from "date-fns";

export function TodayOverviewCard() {
  const { t } = useTranslation();
  const appointments = useAppointments();
  const tasks = useTasks();
  const habits = useHabits();
  const today = todayKey();
  const completions = useCompletionsForDate(today);
  const now = useNow();

  if (!appointments || !tasks || !habits || !completions) {
    return <Card featured padding="lg" className="mx-4 h-28 animate-pulse" />;
  }
  const todaysAppointments = appointments.filter((a) => isSameDay(new Date(a.startAt), now));
  const todaysTasks = tasks.filter((t2) => t2.dueAt && isSameDay(new Date(t2.dueAt), now));
  const completedTasks = todaysTasks.filter((t2) => t2.status === "completed").length;
  const dueHabits = habits.filter((h) => isDueOnDate(h.recurrence, new Date(h.sync.createdAt), now));
  const completedHabits = dueHabits.filter((h) =>
    completions.some((c) => c.habitId === h.id),
  ).length;

  const totalUnits = todaysTasks.length + dueHabits.length;
  const doneUnits = completedTasks + completedHabits;
  const rate = totalUnits > 0 ? doneUnits / totalUnits : 0;

  return (
    <section className="px-4">
      <Card featured padding="lg" className="flex items-center gap-5">
        <ProgressRing value={rate} size={68} strokeWidth={6}>
          <span className="text-base font-bold tabular-nums text-text-primary">{Math.round(rate * 100)}%</span>
        </ProgressRing>
        <div className="flex flex-1 flex-col gap-1.5">
          <p className="text-base font-semibold text-text-primary">{t("home.todayOverview")}</p>
          <p className="text-sm text-text-secondary">
            {t("home.tasksCompletedCount", { done: completedTasks, total: todaysTasks.length })}
            {" · "}
            {todaysAppointments.length} {t("nav.appointments")}
          </p>
        </div>
      </Card>
    </section>
  );
}
