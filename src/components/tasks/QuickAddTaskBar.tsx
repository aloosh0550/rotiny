"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Plus, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { IconButton } from "@/components/ui/IconButton";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { TaskForm } from "./TaskForm";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { tasksRepository } from "@/lib/db/repositories";
import { generateId } from "@/lib/utils/id";
import { createSyncMeta } from "@/lib/utils/sync";
import type { Task } from "@/lib/types";

export interface QuickAddTaskBarProps {
  autoFocus?: boolean;
  onAutoFocused?: () => void;
}

export function QuickAddTaskBar({ autoFocus, onAutoFocused }: QuickAddTaskBarProps) {
  const { t } = useTranslation();
  const { show } = useToast();
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!autoFocus) return;
    inputRef.current?.focus();
    onAutoFocused?.();
    // Only react to autoFocus flipping true; onAutoFocused is expected to be stable-ish
    // and re-running this on every parent render would fight the strip-the-query effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const title = value.trim();
    if (!title || submitting) return;

    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const task: Task = {
        id: generateId(),
        title,
        dueAt: null,
        hasTime: false,
        priority: "normal",
        status: "pending",
        reminders: [],
        sync: createSyncMeta(now),
      };
      await tasksRepository.create(task);
      setValue("");
      show(t("common.saved"), { tone: "success" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* `backdrop-blur` here creates a CSS containing block for `position: fixed`
          descendants, which would trap Sheet's fixed overlay inside this small bar
          instead of the viewport — so Sheet is rendered as a sibling below, not nested
          inside this div. */}
      <div className="sticky top-14 z-20 flex flex-col gap-2 border-b border-border bg-bg/95 px-4 py-3 backdrop-blur">
        <form onSubmit={(e) => void handleSubmit(e)} className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={t("tasks.quickAddPlaceholder")}
            disabled={submitting}
            className="flex-1"
          />
          <IconButton
            type="button"
            icon={<SlidersHorizontal className="size-4" />}
            label={t("tasks.detailsToggle")}
            variant="surface"
            onClick={() => setDetailsOpen(true)}
          />
          <IconButton
            type="submit"
            icon={<Plus className="size-4" />}
            label={t("common.add")}
            variant="primary"
            disabled={submitting || !value.trim()}
          />
        </form>
      </div>

      <Sheet open={detailsOpen} onClose={() => setDetailsOpen(false)} title={t("tasks.newTaskTitle")}>
        <TaskForm
          onSaved={() => {
            setDetailsOpen(false);
            show(t("common.saved"), { tone: "success" });
          }}
          onCancel={() => setDetailsOpen(false)}
        />
      </Sheet>
    </>
  );
}
