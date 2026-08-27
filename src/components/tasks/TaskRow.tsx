"use client";

import Link from "next/link";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/Checkbox";
import { PriorityDot } from "@/components/ui/PriorityDot";
import { Badge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/IconButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useNow } from "@/lib/hooks/useNow";
import { tasksRepository } from "@/lib/db/repositories";
import { ROUTES } from "@/lib/constants/routes";
import { formatDayLabel, formatTime } from "@/lib/time/dateUtils";
import { cn } from "@/lib/utils/cn";
import type { Task } from "@/lib/types";

export interface TaskRowProps {
  task: Task;
}

export function TaskRow({ task }: TaskRowProps) {
  const { t, locale } = useTranslation();
  const { show } = useToast();
  const now = useNow();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isCompleted = task.status === "completed";
  const dueDate = task.dueAt ? new Date(task.dueAt) : null;
  const isOverdue = !isCompleted && dueDate != null && dueDate.getTime() < now.getTime();

  async function toggleComplete(checked: boolean) {
    if (checked) {
      await tasksRepository.update(task.id, {
        status: "completed",
        completedAt: new Date().toISOString(),
      });
      show(t("common.done"), {
        tone: "success",
        action: {
          label: t("tasks.undoComplete"),
          onClick: () => {
            void tasksRepository.update(task.id, { status: "pending", completedAt: null });
          },
        },
      });
    } else {
      await tasksRepository.update(task.id, { status: "pending", completedAt: null });
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5">
      <Checkbox
        checked={isCompleted}
        onCheckedChange={(checked) => void toggleComplete(checked)}
        label={isCompleted ? t("tasks.markIncomplete") : t("tasks.markComplete")}
      />
      <PriorityDot priority={task.priority} />
      <Link href={ROUTES.task(task.id)} className="min-w-0 flex-1 py-0.5">
        <p
          className={cn(
            "truncate text-sm font-medium text-text-primary",
            isCompleted && "text-text-tertiary line-through",
          )}
        >
          {task.title}
        </p>
      </Link>
      {dueDate && (
        <Badge tone={isOverdue ? "danger" : "neutral"} className="shrink-0">
          {formatDayLabel(dueDate, locale)}
          {task.hasTime ? ` · ${formatTime(task.dueAt as string, locale)}` : ""}
        </Badge>
      )}
      <IconButton
        icon={<Trash2 className="size-4" />}
        label={t("common.delete")}
        onClick={() => setConfirmOpen(true)}
      />
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void tasksRepository.delete(task.id)}
        body={t("tasks.deleteConfirm")}
      />
    </div>
  );
}
