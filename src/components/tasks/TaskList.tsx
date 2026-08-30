"use client";

import { useState } from "react";
import { ListTodo } from "lucide-react";
import { TaskRow } from "./TaskRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useTasks } from "@/lib/hooks/useTasks";
import { useNow } from "@/lib/hooks/useNow";
import { endOfDay } from "@/lib/time/dateUtils";
import { PRIORITY_ORDER } from "@/lib/types";
import type { Task } from "@/lib/types";

type Filter = "today" | "upcoming" | "completed";

function sortTasks(tasks: Task[]): Task[] {
  return tasks.slice().sort((a, b) => {
    if ((b.pinned ? 1 : 0) !== (a.pinned ? 1 : 0)) return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
    const priorityDiff = PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority);
    if (priorityDiff !== 0) return priorityDiff;
    if (a.dueAt && b.dueAt) return a.dueAt.localeCompare(b.dueAt);
    if (a.dueAt) return -1;
    if (b.dueAt) return 1;
    return 0;
  });
}

export function TaskList() {
  const { t } = useTranslation();
  const tasks = useTasks();
  const now = useNow();
  const [filter, setFilter] = useState<Filter>("today");

  if (!tasks) {
    return (
      <div className="flex flex-col gap-2 px-4 py-3">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="px-4 py-6">
        <EmptyState
          icon={<ListTodo className="size-6" />}
          title={t("tasks.noTasks")}
          subtitle={t("tasks.noTasksSubtitle")}
        />
      </div>
    );
  }

  const pending = tasks.filter((task) => task.status === "pending");
  const completed = tasks.filter((task) => task.status === "completed");
  const todayEnd = endOfDay(now);

  // "today" also surfaces overdue tasks; "upcoming" is everything else pending
  // (dated later + undated), so nothing pending falls out of the visible filters.
  const todayItems = pending.filter((t2) => t2.dueAt != null && new Date(t2.dueAt) <= todayEnd);
  const upcomingItems = pending.filter((t2) => t2.dueAt == null || new Date(t2.dueAt) > todayEnd);

  const visible =
    filter === "completed"
      ? sortTasks(completed)
      : filter === "upcoming"
        ? sortTasks(upcomingItems)
        : sortTasks(todayItems);

  return (
    <div className="flex flex-col gap-4 px-4 py-3">
      <Tabs
        items={[
          { value: "today", label: t("tasks.filterToday") },
          { value: "upcoming", label: t("tasks.filterUpcoming") },
          { value: "completed", label: t("tasks.filterCompleted") },
        ]}
        value={filter}
        onChange={(v) => setFilter(v as Filter)}
      />

      {visible.length === 0 ? (
        <EmptyState
          compact
          icon={<ListTodo />}
          title={
            filter === "completed"
              ? t("tasks.noCompleted")
              : filter === "upcoming"
                ? t("tasks.noUpcoming")
                : t("tasks.noToday")
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}
