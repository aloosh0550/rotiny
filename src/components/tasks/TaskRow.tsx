"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/Checkbox";
import { Badge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/IconButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Celebration } from "@/components/ui/Celebration";
import { useToast } from "@/components/ui/Toast";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useNow } from "@/lib/hooks/useNow";
import { tasksRepository } from "@/lib/db/repositories";
import { ROUTES } from "@/lib/constants/routes";
import { formatDayLabel, formatTime } from "@/lib/time/dateUtils";
import { cn } from "@/lib/utils/cn";
import type { Priority, Task } from "@/lib/types";

export interface TaskRowProps {
  task: Task;
}

const priorityBar: Record<Priority, string> = {
  important: "bg-priority-important",
  normal: "bg-priority-normal",
  later: "bg-priority-later",
};

export function TaskRow({ task }: TaskRowProps) {
  const { t, locale } = useTranslation();
  const { show } = useToast();
  const now = useNow();
  const reduce = useReducedMotion();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [burst, setBurst] = useState(false);

  const isCompleted = task.status === "completed";
  const dueDate = task.dueAt ? new Date(task.dueAt) : null;
  const isOverdue = !isCompleted && dueDate != null && dueDate.getTime() < now.getTime();

  async function toggleComplete(checked: boolean) {
    if (checked) {
      setBurst(true);
      window.setTimeout(() => setBurst(false), 600);
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
    <motion.div
      layout={!reduce}
      className={cn(
        "relative flex items-stretch gap-3 overflow-hidden rounded-lg border border-border bg-surface pe-2 shadow-xs transition-colors",
        isCompleted && "opacity-60",
      )}
    >
      <span className={cn("w-1 shrink-0", isCompleted ? "bg-border" : priorityBar[task.priority])} />
      <div className="relative flex items-center py-3">
        <Checkbox
          size="md"
          checked={isCompleted}
          onCheckedChange={(checked) => void toggleComplete(checked)}
          label={isCompleted ? t("tasks.markIncomplete") : t("tasks.markComplete")}
        />
        {burst && <Celebration />}
      </div>
      <Link href={ROUTES.task(task.id)} className="flex min-w-0 flex-1 items-center gap-2 py-2">
        <p
          className={cn(
            "min-w-0 flex-1 truncate text-sm font-medium text-text-primary",
            isCompleted && "text-text-tertiary line-through",
          )}
          dir="auto"
        >
          {task.title}
        </p>
        {dueDate && (
          <Badge tone={isOverdue ? "danger" : "neutral"} className="shrink-0">
            {formatDayLabel(dueDate, locale)}
            {task.hasTime ? ` · ${formatTime(task.dueAt as string, locale)}` : ""}
          </Badge>
        )}
      </Link>
      <div className="flex items-center">
        <IconButton
          icon={<Trash2 className="size-4" />}
          label={t("common.delete")}
          size="sm"
          onClick={() => setConfirmOpen(true)}
        />
      </div>
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void tasksRepository.delete(task.id)}
        body={t("tasks.deleteConfirm")}
      />
    </motion.div>
  );
}
