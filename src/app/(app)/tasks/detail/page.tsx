"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { PriorityDot } from "@/components/ui/PriorityDot";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { TaskForm } from "@/components/tasks/TaskForm";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useTasks } from "@/lib/hooks/useTasks";
import { tasksRepository } from "@/lib/db/repositories";
import { ROUTES } from "@/lib/constants/routes";
import { formatFullDate, formatTime, formatDuration } from "@/lib/time/dateUtils";
import { cn } from "@/lib/utils/cn";

function TaskDetailInner() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? undefined;
  const router = useRouter();
  const { t, locale } = useTranslation();
  const { show } = useToast();
  // Read the full list (already reactive via liveQuery) instead of useTask(id):
  // useTasks() only ever returns `undefined` while the very first query is in
  // flight, and always an array afterwards — so "loading" and "not found" stay
  // distinguishable, which a lone useTask(id) can't do (it returns undefined
  // for both cases).
  const tasks = useTasks();
  const [editing, setEditing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isLoading = tasks === undefined;
  const task = tasks?.find((item) => item.id === id);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 px-4 py-4">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="px-4 py-6">
        <EmptyState
          title={t("tasks.notFound")}
          action={
            <Button onClick={() => router.push(ROUTES.tasks)}>{t("common.back")}</Button>
          }
        />
      </div>
    );
  }

  if (editing) {
    return (
      <div className="px-4 py-4">
        <TaskForm
          key={task.id}
          task={task}
          onSaved={() => {
            setEditing(false);
            show(t("common.saved"), { tone: "success" });
          }}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  const isCompleted = task.status === "completed";
  const dueDate = task.dueAt ? new Date(task.dueAt) : null;
  // Re-bind to a plain `Task`-typed const: narrowing from the `if (!task) return`
  // guard above doesn't survive into these nested function declarations, since TS
  // control-flow analysis doesn't extend across function boundaries.
  const currentTask = task;

  async function toggleComplete() {
    if (isCompleted) {
      await tasksRepository.update(currentTask.id, { status: "pending", completedAt: null });
    } else {
      await tasksRepository.update(currentTask.id, {
        status: "completed",
        completedAt: new Date().toISOString(),
      });
    }
  }

  async function handleDelete() {
    await tasksRepository.delete(currentTask.id);
    show(t("common.deleted"), { tone: "success" });
    router.push(ROUTES.tasks);
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <PriorityDot priority={task.priority} className="mt-1.5" />
          <h1
            className={cn(
              "text-lg font-bold text-text-primary",
              isCompleted && "text-text-tertiary line-through",
            )}
          >
            {task.title}
          </h1>
        </div>
        <div className="flex shrink-0 gap-1">
          <IconButton
            icon={<Pencil className="size-4" />}
            label={t("common.edit")}
            onClick={() => setEditing(true)}
          />
          <IconButton
            icon={<Trash2 className="size-4" />}
            label={t("common.delete")}
            onClick={() => setConfirmOpen(true)}
          />
        </div>
      </div>

      <Card className="flex flex-col gap-3">
        <DetailRow
          label={t("tasks.fieldDueDate")}
          value={dueDate ? formatFullDate(dueDate, locale) : t("tasks.noDueDate")}
        />
        {task.hasTime && dueDate && (
          <DetailRow label={t("tasks.fieldDueTime")} value={formatTime(task.dueAt as string, locale)} />
        )}
        {task.durationMinutes != null && (
          <DetailRow
            label={t("tasks.fieldDuration")}
            value={formatDuration(task.durationMinutes, locale)}
          />
        )}
        <DetailRow label={t("tasks.fieldPriority")} value={t(`priority.${task.priority}`)} />
        {task.notes && <DetailRow label={t("tasks.fieldNotes")} value={task.notes} />}
      </Card>

      <Button variant={isCompleted ? "secondary" : "primary"} onClick={() => void toggleComplete()}>
        {isCompleted ? t("tasks.markIncomplete") : t("tasks.markComplete")}
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void handleDelete()}
        body={t("tasks.deleteConfirm")}
      />
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-text-tertiary">{label}</span>
      <span className="text-sm font-medium text-text-primary">{value}</span>
    </div>
  );
}

export default function TaskDetailPage() {
  return (
    <Suspense fallback={<div className="flex flex-col gap-4 p-4"><Skeleton className="h-7 w-2/3" /><Skeleton className="h-40 w-full" /></div>}>
      <TaskDetailInner />
    </Suspense>
  );
}
