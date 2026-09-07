"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { DatePicker } from "@/components/ui/DatePicker";
import { TimePicker } from "@/components/ui/TimePicker";
import { Button } from "@/components/ui/Button";
import { PriorityPicker } from "./PriorityPicker";
import { ReminderEditor } from "@/components/shared/ReminderEditor";
import { RecurrenceEditor } from "@/components/shared/RecurrenceEditor";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useLiveQuery } from "dexie-react-hooks";
import { taskCategoriesRepository, tasksRepository } from "@/lib/db/repositories";
import { useSettings } from "@/lib/hooks/useSettings";
import { onEntityMutated } from "@/lib/services/effects/appEffects";
import { generateId } from "@/lib/utils/id";
import { createSyncMeta } from "@/lib/utils/sync";
import { dateKey, combineDateAndTime } from "@/lib/time/dateUtils";
import type { Task, Priority, Reminder, RecurrenceRule } from "@/lib/types";

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
  const settings = useSettings();
  const categories = useLiveQuery(() => taskCategoriesRepository.getAllSorted(), []) ?? [];

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
  const [categoryId, setCategoryId] = useState<string>(task?.categoryId ?? "");
  const [pinned, setPinned] = useState<boolean>(task?.pinned ?? false);
  const [reminders, setReminders] = useState<Reminder[]>(task?.reminders ?? []);
  const remindersTouched = useRef(isEdit);

  // Seed reminders for a new task from the user's default lead-times (once).
  useEffect(() => {
    if (remindersTouched.current || !settings) return;
    remindersTouched.current = true;
    const defaults = settings.notifications.reminderDefaults ?? [];
    if (defaults.length === 0) return;
    const id = window.setTimeout(() => {
      setReminders(
        defaults.map((offsetMinutes) => ({
          id: generateId(),
          offsetMinutes,
          method: "push" as const,
        })),
      );
    }, 0);
    return () => window.clearTimeout(id);
  }, [settings]);

  const handleRemindersChange = (next: Reminder[]) => {
    remindersTouched.current = true;
    setReminders(next);
  };
  const [recurrence, setRecurrence] = useState<RecurrenceRule | null>(task?.recurrence ?? null);
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [energyCost, setEnergyCost] = useState<"low" | "med" | "high" | "">(task?.energyCost ?? "");
  const [plannedFor, setPlannedFor] = useState(task?.plannedFor ?? "");
  const [contextTags, setContextTags] = useState<string[]>(task?.context ?? []);
  const [contextDraft, setContextDraft] = useState("");
  const [saving, setSaving] = useState(false);

  // Life Area / Goal links are preserved on edit; their pickers appear once
  // those features exist (Phases 6–7).
  const lifeAreaId = task?.lifeAreaId ?? null;
  const goalId = task?.goalId ?? null;

  function addContextTag() {
    const v = contextDraft.trim();
    if (v && !contextTags.includes(v)) setContextTags((s) => [...s, v]);
    setContextDraft("");
  }

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
      const common = {
        title: trimmedTitle,
        notes: trimmedNotes || undefined,
        dueAt,
        hasTime,
        durationMinutes,
        priority,
        categoryId: categoryId || null,
        pinned,
        reminders,
        recurrence,
        energyCost: energyCost || null,
        plannedFor: plannedFor || null,
        context: contextTags,
        lifeAreaId,
        goalId,
      };

      if (isEdit && task) {
        const updated = await tasksRepository.update(task.id, common);
        await onEntityMutated({ type: "task", op: "update", entity: updated });
        onSaved?.(updated);
      } else {
        const now = new Date().toISOString();
        const newTask: Task = {
          id: generateId(),
          ...common,
          status: "pending",
          sync: createSyncMeta(now),
        };
        const created = await tasksRepository.create(newTask);
        await onEntityMutated({ type: "task", op: "create", entity: created });
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
        dir="auto"
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

      {categories.length > 0 && (
        <Select
          label={t("smartAdd.fieldCategory")}
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          options={[
            { value: "", label: t("smartAdd.noCategory") },
            ...categories.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
      )}

      <PriorityPicker label={t("tasks.fieldPriority")} value={priority} onChange={setPriority} />

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-text-secondary">{t("tasks.markImportant")}</span>
        <Switch checked={pinned} onCheckedChange={setPinned} label={t("tasks.markImportant")} />
      </div>

      <RecurrenceEditor value={recurrence} onChange={setRecurrence} />

      <ReminderEditor value={reminders} onChange={handleRemindersChange} />

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

      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-text-secondary">
          {t("tasks.fieldEnergyCost")}
        </span>
        <div className="flex gap-2">
          {(["low", "med", "high"] as const).map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setEnergyCost((c) => (c === lvl ? "" : lvl))}
              className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                energyCost === lvl
                  ? "border-accent bg-accent-soft text-accent-fg"
                  : "border-border bg-surface text-text-secondary"
              }`}
            >
              {t(`tasks.energy${lvl === "low" ? "Low" : lvl === "med" ? "Med" : "High"}`)}
            </button>
          ))}
        </div>
      </div>

      <DatePicker
        label={t("tasks.fieldPlannedFor")}
        value={plannedFor}
        onChange={(e) => setPlannedFor(e.target.value)}
      />

      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-text-secondary">{t("tasks.fieldContext")}</span>
        {contextTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {contextTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setContextTags((s) => s.filter((x) => x !== tag))}
                className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-fg"
              >
                {tag} ✕
              </button>
            ))}
          </div>
        )}
        <Input
          placeholder={t("tasks.contextPlaceholder")}
          value={contextDraft}
          dir="auto"
          onChange={(e) => setContextDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addContextTag();
            }
          }}
          onBlur={addContextTag}
        />
      </div>

      <Textarea
        label={t("tasks.fieldNotes")}
        placeholder={t("common.optional")}
        value={notes}
        dir="auto"
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
