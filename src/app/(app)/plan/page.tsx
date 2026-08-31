"use client";

import { useMemo } from "react";
import Link from "next/link";
import { isSameDay } from "date-fns";
import { CalendarDays, ListChecks, Repeat2, Sunrise, Sun, Moon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { IconTile, type TileColor } from "@/components/ui/IconTile";
import { SubpageHeader } from "@/components/more/SubpageHeader";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useTasks } from "@/lib/hooks/useTasks";
import { useAppointments } from "@/lib/hooks/useAppointments";
import { useHabits, useCompletionsForDate } from "@/lib/hooks/useHabits";
import { useNow } from "@/lib/hooks/useNow";
import { todayKey, formatTime } from "@/lib/time/dateUtils";
import { isDueOnDate } from "@/lib/time/recurrence";
import { ROUTES } from "@/lib/constants/routes";

type Bucket = "morning" | "afternoon" | "evening";

interface PlanItem {
  id: string;
  kind: "task" | "appointment" | "habit";
  title: string;
  time: string | null; // display
  href: string;
  done: boolean;
  sortKey: number;
}

const BUCKET_ICON = { morning: Sunrise, afternoon: Sun, evening: Moon };
const KIND_ICON = { task: ListChecks, appointment: CalendarDays, habit: Repeat2 };
const KIND_COLOR: Record<PlanItem["kind"], TileColor> = {
  task: "amber",
  appointment: "indigo",
  habit: "green",
};

function bucketOf(date: Date | null): Bucket {
  if (!date) return "morning";
  const h = date.getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

export default function DailyPlanPage() {
  const { t, locale } = useTranslation();
  const now = useNow();
  const tasks = useTasks();
  const appointments = useAppointments();
  const habits = useHabits();
  const completions = useCompletionsForDate(todayKey());

  const items = useMemo<PlanItem[]>(() => {
    if (!tasks || !appointments || !habits || !completions) return [];
    const out: PlanItem[] = [];

    for (const task of tasks) {
      if (task.status === "cancelled") continue;
      if (!task.dueAt || !isSameDay(new Date(task.dueAt), now)) continue;
      const d = new Date(task.dueAt);
      out.push({
        id: task.id,
        kind: "task",
        title: task.title,
        time: task.hasTime ? formatTime(task.dueAt, locale) : null,
        href: ROUTES.task(task.id),
        done: task.status === "completed",
        sortKey: task.hasTime ? d.getTime() : d.setHours(9, 0, 0, 0),
      });
    }

    for (const a of appointments) {
      if (!isSameDay(new Date(a.startAt), now)) continue;
      out.push({
        id: a.id,
        kind: "appointment",
        title: a.title,
        time: formatTime(a.startAt, locale),
        href: ROUTES.appointment(a.id),
        done: new Date(a.endAt).getTime() < now.getTime(),
        sortKey: new Date(a.startAt).getTime(),
      });
    }

    const doneHabitIds = new Set(completions.map((c) => c.habitId));
    for (const h of habits) {
      if (!isDueOnDate(h.recurrence, new Date(h.sync.createdAt), now)) continue;
      const timeDate = h.timeOfDay ? new Date(`${todayKey()}T${h.timeOfDay}:00`) : null;
      out.push({
        id: h.id,
        kind: "habit",
        title: h.title,
        time: h.timeOfDay ? formatTime(`${todayKey()}T${h.timeOfDay}:00`, locale) : null,
        href: ROUTES.habit(h.id),
        done: doneHabitIds.has(h.id),
        sortKey: (timeDate ?? new Date(new Date().setHours(7, 0, 0, 0))).getTime(),
      });
    }

    return out.sort((x, y) => x.sortKey - y.sortKey);
  }, [tasks, appointments, habits, completions, now, locale]);

  const grouped = useMemo(() => {
    const g: Record<Bucket, PlanItem[]> = { morning: [], afternoon: [], evening: [] };
    for (const it of items) {
      g[bucketOf(it.time ? new Date(it.sortKey) : null)].push(it);
    }
    return g;
  }, [items]);

  const total = items.length;
  const done = items.filter((i) => i.done).length;

  const loading = !tasks || !appointments || !habits || !completions;

  return (
    <div className="flex flex-col gap-5 py-2">
      <SubpageHeader title={t("plan.pageTitle")} backHref={ROUTES.home} />
      <div className="flex flex-col gap-5 px-4">

      {!loading && total > 0 && (
        <Card padding="md" className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-text-primary">
              {t("plan.progress", { done, total })}
            </span>
            <span className="text-sm font-bold tabular-nums text-accent-fg">
              {Math.round((done / total) * 100)}%
            </span>
          </div>
          <ProgressBar value={total ? done / total : 0} />
        </Card>
      )}

      {loading ? (
        <div className="flex flex-col gap-2">
          <div className="h-16 skeleton rounded-lg" />
          <div className="h-16 skeleton rounded-lg" />
        </div>
      ) : total === 0 ? (
        <EmptyState
          icon={<CalendarDays className="size-6" />}
          title={t("plan.empty")}
          subtitle={t("plan.emptySubtitle")}
        />
      ) : (
        (["morning", "afternoon", "evening"] as Bucket[]).map((bucket) => {
          const list = grouped[bucket];
          if (list.length === 0) return null;
          const BIcon = BUCKET_ICON[bucket];
          return (
            <section key={bucket} className="flex flex-col gap-2">
              <h2 className="flex items-center gap-2 text-[13px] font-semibold text-text-secondary">
                <BIcon className="size-4" />
                {t(`plan.${bucket}`)}
              </h2>
              <div className="flex flex-col gap-2">
                {list.map((it) => {
                  const KIcon = KIND_ICON[it.kind];
                  return (
                    <Link key={`${it.kind}-${it.id}`} href={it.href}>
                      <Card interactive padding="sm" className="flex items-center gap-3">
                        <IconTile color={KIND_COLOR[it.kind]}>
                          <KIcon className="size-4" />
                        </IconTile>
                        <span
                          className={`min-w-0 flex-1 truncate text-sm font-medium ${
                            it.done ? "text-text-tertiary line-through" : "text-text-primary"
                          }`}
                          dir="auto"
                        >
                          {it.title}
                        </span>
                        {it.time && (
                          <span className="shrink-0 text-xs tabular-nums text-text-tertiary">
                            {it.time}
                          </span>
                        )}
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })
      )}
      </div>
    </div>
  );
}
