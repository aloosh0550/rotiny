"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, ListTodo } from "lucide-react";
import { TaskRow } from "./TaskRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useTasks } from "@/lib/hooks/useTasks";
import { useNow } from "@/lib/hooks/useNow";
import { endOfDay } from "@/lib/time/dateUtils";
import { PRIORITY_ORDER } from "@/lib/types";
import type { Task } from "@/lib/types";

function sortTasks(tasks: Task[]): Task[] {
  return tasks.slice().sort((a, b) => {
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
  const [completedOpen, setCompletedOpen] = useState(false);

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
          icon={<ListTodo className="size-8" />}
          title={t("tasks.noTasks")}
          subtitle={t("tasks.noTasksSubtitle")}
        />
      </div>
    );
  }

  const pending = tasks.filter((task) => task.status === "pending");
  const completed = tasks.filter((task) => task.status === "completed");

  // Overdue tasks (dueAt before today) surface in "today" alongside tasks due
  // today, so nothing pending silently falls out of every group; TaskRow still
  // gives them a distinct overdue tint.
  const todayEnd = endOfDay(now);
  const today = pending.filter((task) => task.dueAt != null && new Date(task.dueAt) <= todayEnd);
  const upcoming = pending.filter((task) => task.dueAt != null && new Date(task.dueAt) > todayEnd);
  const later = pending.filter((task) => task.dueAt == null);

  const groups: { key: string; label: string; items: Task[] }[] = [
    { key: "today", label: t("tasks.groupToday"), items: sortTasks(today) },
    { key: "upcoming", label: t("tasks.groupUpcoming"), items: sortTasks(upcoming) },
    { key: "later", label: t("tasks.groupLater"), items: sortTasks(later) },
  ];

  return (
    <div className="flex flex-col gap-5 px-4 py-3">
      {groups.map((group) =>
        group.items.length > 0 ? (
          <section key={group.key} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-text-secondary">{group.label}</h2>
            <div className="flex flex-col gap-2">
              {group.items.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </div>
          </section>
        ) : null,
      )}

      {completed.length > 0 && (
        <section className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setCompletedOpen((open) => !open)}
            className="flex w-full items-center justify-between py-1 text-start"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-text-secondary">
              {t("tasks.groupCompleted")}
              <Badge tone="neutral">{completed.length}</Badge>
            </span>
            {completedOpen ? (
              <ChevronUp className="size-4 text-text-tertiary" />
            ) : (
              <ChevronDown className="size-4 text-text-tertiary" />
            )}
          </button>
          {completedOpen && (
            <div className="flex flex-col gap-2">
              {sortTasks(completed).map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
