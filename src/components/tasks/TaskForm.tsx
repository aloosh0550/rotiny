"use client";

import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { DatePicker } from "@/components/ui/DatePicker";
import { TimePicker } from "@/components/ui/TimePicker";
import { Button } from "@/components/ui/Button";
import { PriorityPicker } from "./PriorityPicker";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { tasksRepository } from "@/lib/db/repositories";
import { generateId } from "@/lib/utils/id";
import { createSyncMeta } from "@/lib/utils/sync";
import { dateKey, combineDateAndTime } from "@/lib/time/dateUtils";
import type { Task, Priority } from "@/lib/types";

export interface TaskFormProps {
  task?: Task;
  onSaved?: (task: Task) => void;
  onCancel?: () => void;
}

function toTimeString(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function TaskForm({ task, onSaved, onCancel }: TaskFormProps) {
  const { t } = useTranslation();
  const isEdit = Boolean(task);

  const [title, setTitle] = useState(task?.title ?? "");
  const [titleError, setTitleError] = useState<string | undefined>();
  const [dueDate, setDueDate] = useState(task?.dueAt ? dateKey(new Date(task.dueAt)) : "");
  const [dueTime, setDueTime] = useState(
    task?.hasTime && task?.dueAt ? toTimeString(task.dueAt) : "",
  );
  const [duration, setDuration] = useState(
    task?.durationMinutes != null ? String(task.durationMinutes) : "",
  );
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "normal");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setTitleError(t("tasks.fieldTitlePlaceholder"));
      return;
    }

    setSaving(true);
    try {
      const hasTime = Boolean(dueDate && dueTime);
      const dueAt = dueDate ? combineDateAndTime(dueDate, dueTime || "00:00") : null;
      const parsedDuration = Number(duration);
      const durationMinutes =
        duration.trim() !== "" && Number.isFinite(parsedDuration) && parsedDuration > 0
          ? parsedDuration
          : null;
      const trimmedNotes = notes.trim();

      if (isEdit && task) {
        const updated = await tasksRepository.update(task.id, {
          title: trimmedTitle,
          dueAt,
          hasTime,
          durationMinutes,
          priority,
          notes: trimmedNotes || undefined,
        });
        onSaved?.(updated);
      } else {
        const now = new Date().toISOString();
        const newTask: Task = {
          id: generateId(),
          title: trimmedTitle,
          notes: trimmedNotes || undefined,
          dueAt,
          hasTime,
          durationMinutes,
          priority,
          status: "pending",
          reminders: [],
          sync: createSyncMeta(now),
        };
        const created = await tasksRepository.create(newTask);
        onSaved?.(created);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
      <Input
        label={t("tasks.fieldTitle")}
        placeholder={t("tasks.fieldTitlePlaceholder")}
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          if (titleError) setTitleError(undefined);
        }}
        error={titleError}
        autoFocus={!isEdit}
        required
      />

      <div className="grid grid-cols-2 gap-3">
        <DatePicker
          label={t("tasks.fieldDueDate")}
          value={dueDate}
          onChange={(e) => {
            setDueDate(e.target.value);
            if (!e.target.value) setDueTime("");
          }}
        />
        <TimePicker
          label={t("tasks.fieldDueTime")}
          value={dueTime}
          onChange={(e) => setDueTime(e.target.value)}
          disabled={!dueDate}
        />
      </div>

      <Input
        type="number"
        min={0}
        step={5}
        inputMode="numeric"
        label={t("tasks.fieldDuration")}
        placeholder={t("common.optional")}
        hint={t("common.minutes")}
        value={duration}
        onChange={(e) => setDuration(e.target.value)}
      />

      <PriorityPicker label={t("tasks.fieldPriority")} value={priority} onChange={setPriority} />

      <Textarea
        label={t("tasks.fieldNotes")}
        placeholder={t("common.optional")}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <div className="flex gap-2 pt-1">
        {onCancel && (
          <Button type="button" variant="secondary" fullWidth onClick={onCancel}>
            {t("common.cancel")}
          </Button>
        )}
        <Button type="submit" fullWidth loading={saving}>
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
}
