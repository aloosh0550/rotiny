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
import { onEntityMutated } from "@/lib/services/effects/appEffects";
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
      const updated = await tasksRepository.update(task.id, {
        status: "completed",
        completedAt: new Date().toISOString(),
      });
      await onEntityMutated({ type: "task", op: "update", entity: updated });
      show(t("common.done"), {
        tone: "success",
        action: {
          label: t("tasks.undoComplete"),
          onClick: () => {
            void tasksRepository
              .update(task.id, { status: "pending", completedAt: null })
              .then((u) => onEntityMutated({ type: "task", op: "update", entity: u }));
          },
        },
      });
    } else {
      const u = await tasksRepository.update(task.id, { status: "pending", completedAt: null });
      await onEntityMutated({ type: "task", op: "update", entity: u });
    }
  }

  return (
    <motion.div
      layout={!reduce}
      className={cn(
        "relative flex gap-3 overflow-hidden rounded-lg border border-border bg-surface py-3 pe-2 ps-3 shadow-xs transition-colors",
        isCompleted && "opacity-60",
      )}
    >
      <span
        className={cn(
          "absolute inset-y-2 start-0 w-1 rounded-full",
          isCompleted ? "bg-border" : priorityBar[task.priority],
        )}
      />
      <div className="relative flex shrink-0 items-start pt-0.5">
        <Checkbox
          size="md"
          checked={isCompleted}
          onCheckedChange={(checked) => void toggleComplete(checked)}
          label={isCompleted ? t("tasks.markIncomplete") : t("tasks.markComplete")}
        />
        {burst && <Celebration />}
      </div>

      <Link href={ROUTES.task(task.id)} className="min-w-0 flex-1 py-0.5">
        <p
          className={cn(
            "text-sm font-medium leading-snug text-text-primary line-clamp-2",
            isCompleted && "text-text-tertiary line-through",
          )}
          dir="auto"
        >
          {task.title}
        </p>
        {dueDate && (
          <Badge tone={isOverdue ? "danger" : "neutral"} className="mt-1.5">
            {formatDayLabel(dueDate, locale)}
            {task.hasTime ? ` · ${formatTime(task.dueAt as string, locale)}` : ""}
          </Badge>
        )}
      </Link>

      <IconButton
        icon={<Trash2 className="size-4" />}
        label={t("common.delete")}
        size="sm"
        className="-mt-0.5 shrink-0 text-text-tertiary"
        onClick={() => setConfirmOpen(true)}
      />
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() =>
          void tasksRepository
            .delete(task.id)
            .then(() => onEntityMutated({ type: "task", op: "delete", entity: { id: task.id } }))
        }
        body={t("tasks.deleteConfirm")}
      />
    </motion.div>
  );
}
