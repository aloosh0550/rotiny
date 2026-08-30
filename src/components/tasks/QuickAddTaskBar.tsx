"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Plus, SlidersHorizontal } from "lucide-react";
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
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 flex flex-col gap-2 bg-bg/90 px-4 py-3 backdrop-blur-lg md:top-0 md:px-0">
        <form onSubmit={(e) => void handleSubmit(e)} className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={t("tasks.quickAddPlaceholder")}
            disabled={submitting}
            dir="auto"
            aria-label={t("tasks.newTaskTitle")}
            className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-bg-elevated px-3.5 text-sm text-text-primary placeholder:text-text-tertiary transition-colors duration-150 focus:border-accent focus:shadow-focus focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setDetailsOpen(true)}
            aria-label={t("tasks.detailsToggle")}
            className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-text-secondary transition-colors hover:bg-surface-hover active:scale-95"
          >
            <SlidersHorizontal className="size-[18px]" />
          </button>
          <button
            type="submit"
            aria-label={t("common.add")}
            disabled={submitting || !value.trim()}
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-ink shadow-sm transition-[background-color,transform] hover:bg-accent-strong active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
          >
            <Plus className="size-5" strokeWidth={2.5} />
          </button>
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
