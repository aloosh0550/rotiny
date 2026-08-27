"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { AlertTriangle, CheckCircle2, History, Trophy } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatCard } from "@/components/more/StatCard";
import { WeeklyBarChart } from "@/components/more/WeeklyBarChart";
import { habitCompletionsRepository } from "@/lib/db/repositories";
import { useSettings } from "@/lib/hooks/useSettings";
import { useTasks } from "@/lib/hooks/useTasks";
import { useHabits } from "@/lib/hooks/useHabits";
import { useNow } from "@/lib/hooks/useNow";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { addDays, dateKey, formatWeekday, isSameDay, startOfWeek } from "@/lib/time/dateUtils";
import { computeHabitStats } from "@/lib/time/streak";
import type { Task } from "@/lib/types";

function isCompletedWithDate(task: Task): task is Task & { completedAt: string } {
  return task.status === "completed" && typeof task.completedAt === "string";
}

export default function StatisticsPage() {
  const { t, locale } = useTranslation();
  const settings = useSettings();
  const tasks = useTasks();
  const habits = useHabits();
  // habitCompletionsRepository.getAll() is a pure read, safe to call inside useLiveQuery.
  const allCompletions = useLiveQuery(() => habitCompletionsRepository.getAll(), []);
  const now = useNow();

  if (!settings || !tasks || !habits || !allCompletions) {
    return (
      <div className="flex flex-col gap-3 px-4 pt-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  const thisWeekStart = startOfWeek(now, settings.weekStartsOn);
  const thisWeekEnd = addDays(thisWeekStart, 7);
  const lastWeekStart = addDays(thisWeekStart, -7);
  const lastWeekEnd = thisWeekStart;

  const completedTasks = tasks.filter(isCompletedWithDate);
  const completedThisWeek = completedTasks.filter((task) => {
    const d = new Date(task.completedAt);
    return d >= thisWeekStart && d < thisWeekEnd;
  });
  const completedLastWeek = completedTasks.filter((task) => {
    const d = new Date(task.completedAt);
    return d >= lastWeekStart && d < lastWeekEnd;
  });

  const overdueCount = tasks.filter(
    (task) => task.status === "pending" && task.dueAt != null && new Date(task.dueAt) < now,
  ).length;

  const dayBuckets = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(thisWeekStart, i);
    const key = dateKey(date);
    const count = completedThisWeek.filter(
      (task) => dateKey(new Date(task.completedAt)) === key,
    ).length;
    return { date, count };
  });

  const mostProductive = dayBuckets.reduce(
    (best, day) => (day.count > best.count ? day : best),
    dayBuckets[0],
  );
  const hasProductiveData = mostProductive.count > 0;

  const habitStats = habits.map((habit) => {
    const completionsForHabit = allCompletions.filter((c) => c.habitId === habit.id);
    const stats = computeHabitStats(
      habit.recurrence,
      new Date(habit.sync.createdAt),
      completionsForHabit,
      now,
    );
    return { habit, stats };
  });
  const avgConsistency =
    habitStats.length > 0
      ? habitStats.reduce((sum, h) => sum + h.stats.completionRate, 0) / habitStats.length
      : 0;

  return (
    <div className="flex flex-col gap-6 pb-6 pt-4">
      <section className="grid grid-cols-2 gap-3 px-4">
        <StatCard
          icon={<CheckCircle2 className="size-4" />}
          label={t("statistics.thisWeek")}
          value={completedThisWeek.length}
          subtitle={t("statistics.completedTasks")}
        />
        <StatCard
          icon={<History className="size-4" />}
          label={t("statistics.lastWeek")}
          value={completedLastWeek.length}
          subtitle={t("statistics.completedTasks")}
        />
      </section>

      <section className="grid grid-cols-2 gap-3 px-4">
        <StatCard
          icon={<AlertTriangle className="size-4" />}
          label={t("statistics.overdueTasks")}
          value={overdueCount}
        />
        <StatCard
          icon={<Trophy className="size-4" />}
          label={t("statistics.mostProductiveDay")}
          value={hasProductiveData ? formatWeekday(mostProductive.date, locale, "short") : "–"}
          subtitle={hasProductiveData ? undefined : t("statistics.noDataYet")}
        />
      </section>

      <section className="flex flex-col gap-2 px-4">
        <h3 className="text-sm font-semibold text-text-secondary">{t("statistics.weeklyCompletion")}</h3>
        <Card>
          <p className="mb-3 text-xs text-text-tertiary">{t("statistics.tasksPerDay")}</p>
          <WeeklyBarChart
            data={dayBuckets.map((day) => ({
              label: formatWeekday(day.date, locale, "short"),
              value: day.count,
              isToday: isSameDay(day.date, now),
            }))}
          />
        </Card>
      </section>

      <section className="flex flex-col gap-2 px-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-secondary">{t("statistics.habitConsistency")}</h3>
          {habitStats.length > 0 && (
            <span className="text-xs font-semibold text-accent">
              {Math.round(avgConsistency * 100)}%
            </span>
          )}
        </div>
        {habitStats.length === 0 ? (
          <EmptyState title={t("statistics.noDataYet")} />
        ) : (
          <Card className="flex flex-col gap-4">
            {habitStats.map(({ habit, stats }) => (
              <div key={habit.id} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm text-text-primary">{habit.title}</span>
                  <span className="shrink-0 text-xs font-medium text-text-tertiary">
                    {Math.round(stats.completionRate * 100)}%
                  </span>
                </div>
                <ProgressBar value={stats.completionRate} />
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}
