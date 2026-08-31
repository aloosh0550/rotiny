"use client";

import { useMemo } from "react";
import { addDays } from "date-fns";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Flame,
  Minus,
  Repeat2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { SubpageHeader } from "@/components/more/SubpageHeader";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useTasks } from "@/lib/hooks/useTasks";
import { useAppointments } from "@/lib/hooks/useAppointments";
import { useHabits } from "@/lib/hooks/useHabits";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/schema";
import { useNow } from "@/lib/hooks/useNow";
import { computeHabitStats, getExpectedDateKeys } from "@/lib/time/streak";
import { dateKey, startOfDay } from "@/lib/time/dateUtils";
import type { HabitCompletion } from "@/lib/types";
import { ROUTES } from "@/lib/constants/routes";

function inRange(iso: string | null | undefined, from: Date, to: Date): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= from.getTime() && t < to.getTime();
}

export default function WeeklySummaryPage() {
  const { t } = useTranslation();
  const now = useNow();
  const tasks = useTasks();
  const appointments = useAppointments();
  const habits = useHabits();
  const habitCompletions = useLiveQuery(() => db.habitCompletions.toArray(), []);
  const dhikrProgress = useLiveQuery(() => db.dhikrProgress.toArray(), []);

  const s = useMemo(() => {
    if (!tasks || !appointments || !habits || !habitCompletions || !dhikrProgress) return null;

    const today = startOfDay(now);
    const weekStart = addDays(today, -6);
    const weekEnd = addDays(today, 1);
    const prevStart = addDays(today, -13);
    const prevEnd = weekStart;

    const weekKeys = new Set<string>();
    for (let d = new Date(weekStart); d < weekEnd; d.setDate(d.getDate() + 1)) {
      weekKeys.add(dateKey(new Date(d)));
    }

    const tasksDone = tasks.filter(
      (x) => x.status === "completed" && inRange(x.completedAt, weekStart, weekEnd),
    ).length;
    const tasksDoneBefore = tasks.filter(
      (x) => x.status === "completed" && inRange(x.completedAt, prevStart, prevEnd),
    ).length;
    const tasksDue = tasks.filter(
      (x) =>
        inRange(x.dueAt, weekStart, weekEnd) ||
        (x.status === "completed" && inRange(x.completedAt, weekStart, weekEnd)),
    ).length;

    const apptCount = appointments.filter((a) => inRange(a.startAt, weekStart, weekEnd)).length;

    const byHabit = new Map<string, HabitCompletion[]>();
    for (const c of habitCompletions) {
      const arr = byHabit.get(c.habitId) ?? [];
      arr.push(c);
      byHabit.set(c.habitId, arr);
    }

    let expected = 0;
    let completed = 0;
    let bestStreak = 0;
    for (const h of habits) {
      const comps = byHabit.get(h.id) ?? [];
      const exp = getExpectedDateKeys(h.recurrence, new Date(h.sync.createdAt), weekStart, today);
      const doneKeys = new Set(comps.map((c) => c.date));
      for (const k of exp) {
        if (!weekKeys.has(k)) continue;
        expected += 1;
        if (doneKeys.has(k)) completed += 1;
      }
      bestStreak = Math.max(bestStreak, computeHabitStats(h.recurrence, new Date(h.sync.createdAt), comps, now).longest);
    }
    const habitPercent = expected > 0 ? Math.round((completed / expected) * 100) : 0;

    const adhkarDays = new Set(
      dhikrProgress
        .filter((p) => p.completedAt && weekKeys.has(p.date))
        .map((p) => p.date),
    ).size;

    return { tasksDone, tasksDue: Math.max(tasksDue, tasksDone), tasksDoneBefore, apptCount, habitPercent, adhkarDays, bestStreak };
  }, [tasks, appointments, habits, habitCompletions, dhikrProgress, now]);

  return (
    <div className="flex flex-col gap-5 pb-6">
      <SubpageHeader title={t("summary.pageTitle")} backHref={ROUTES.more} />

      <div className="flex flex-col gap-3 px-4">
        {!s ? (
          <>
            <div className="h-16 skeleton rounded-lg" />
            <div className="h-16 skeleton rounded-lg" />
            <div className="h-16 skeleton rounded-lg" />
          </>
        ) : (
          <>
            <Row
              icon={<CheckCircle2 className="size-5 text-accent-amber" />}
              text={t("summary.tasksLine", { done: s.tasksDone, total: s.tasksDue })}
              delta={s.tasksDone - s.tasksDoneBefore}
              t={t}
            />
            <Row
              icon={<CalendarDays className="size-5 text-accent-indigo" />}
              text={t("summary.appointmentsLine", { count: s.apptCount })}
            />
            <Row
              icon={<Repeat2 className="size-5 text-accent-green" />}
              text={t("summary.habitsLine", { percent: s.habitPercent })}
            />
            <Row
              icon={<BookOpen className="size-5 text-accent-violet" />}
              text={t("summary.adhkarLine", { days: s.adhkarDays })}
            />
            <Row
              icon={<Flame className="size-5 text-warning" />}
              text={t("summary.bestStreak", { count: s.bestStreak })}
            />
          </>
        )}
      </div>
    </div>
  );
}

function Row({
  icon,
  text,
  delta,
  t,
}: {
  icon: React.ReactNode;
  text: string;
  delta?: number;
  t?: (k: "summary.up" | "summary.down" | "summary.same") => string;
}) {
  return (
    <Card className="flex items-center gap-3">
      {icon}
      <span className="min-w-0 flex-1 text-sm font-medium text-text-primary">{text}</span>
      {delta !== undefined && t && (
        <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-text-tertiary">
          {delta > 0 ? (
            <TrendingUp className="size-3.5 text-success" />
          ) : delta < 0 ? (
            <TrendingDown className="size-3.5 text-danger" />
          ) : (
            <Minus className="size-3.5" />
          )}
          {t(delta > 0 ? "summary.up" : delta < 0 ? "summary.down" : "summary.same")}
        </span>
      )}
    </Card>
  );
}
