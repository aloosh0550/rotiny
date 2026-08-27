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

function Metric({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-lg font-bold tabular-nums text-text-primary">{value}</span>
      <span className="text-xs text-text-secondary">{label}</span>
    </div>
  );
}

export function TodayOverviewCard() {
  const { t } = useTranslation();
  const appointments = useAppointments();
  const tasks = useTasks();
  const habits = useHabits();
  const today = todayKey();
  const completions = useCompletionsForDate(today);
  const now = useNow();

  if (!appointments || !tasks || !habits || !completions) {
    return <div className="mx-4 h-36 skeleton rounded-lg md:mx-0" />;
  }
  const todaysAppointments = appointments.filter((a) => isSameDay(new Date(a.startAt), now));
  const todaysTasks = tasks.filter((t2) => t2.dueAt && isSameDay(new Date(t2.dueAt), now));
  const completedTasks = todaysTasks.filter((t2) => t2.status === "completed").length;
  const dueHabits = habits.filter((h) => isDueOnDate(h.recurrence, new Date(h.sync.createdAt), now));
  const completedHabits = dueHabits.filter((h) => completions.some((c) => c.habitId === h.id)).length;

  const totalUnits = todaysTasks.length + dueHabits.length;
  const doneUnits = completedTasks + completedHabits;
  const rate = totalUnits > 0 ? doneUnits / totalUnits : 0;
  const pct = Math.round(rate * 100);

  return (
    <section className="px-4 md:px-0">
      <Card accent padding="lg" className="flex items-center gap-5">
        <ProgressRing value={rate} size={86} strokeWidth={8}>
          <span className="text-lg font-bold tabular-nums text-text-primary">{pct}%</span>
        </ProgressRing>
        <div className="flex flex-1 flex-col gap-3">
          <p className="text-base font-bold text-text-primary">{t("home.todayOverview")}</p>
          <div className="flex items-center gap-6">
            <Metric value={`${completedTasks}/${todaysTasks.length}`} label={t("nav.tasks")} />
            <Metric value={`${completedHabits}/${dueHabits.length}`} label={t("nav.habits")} />
            <Metric value={todaysAppointments.length} label={t("nav.appointments")} />
          </div>
        </div>
      </Card>
    </section>
  );
}
