"use client";

import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/Input";
import { Chip } from "@/components/ui/Chip";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { TimePicker } from "@/components/ui/TimePicker";
import { Button } from "@/components/ui/Button";
import { ReminderEditor } from "@/components/shared/ReminderEditor";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useLifeAreas, useGoals } from "@/lib/hooks/useAreasGoals";
import { useNow } from "@/lib/hooks/useNow";
import { habitsRepository } from "@/lib/db/repositories";
import { onEntityMutated } from "@/lib/services/effects/appEffects";
import { generateId } from "@/lib/utils/id";
import { createSyncMeta } from "@/lib/utils/sync";
import type { TranslationKey } from "@/lib/i18n/paths";
import type { Habit, HabitTarget, RecurrenceRule, Reminder } from "@/lib/types";

export interface HabitFormProps {
  habit?: Habit;
  onSaved: () => void;
  onCancel: () => void;
}

type RecurrenceMode = "daily" | "weekdays" | "weekly" | "custom";

const RECURRENCE_MODES: RecurrenceMode[] = ["daily", "weekdays", "weekly", "custom"];

const RECURRENCE_MODE_LABEL_KEY: Record<RecurrenceMode, TranslationKey> = {
  daily: "habits.recurrenceDaily",
  weekdays: "habits.recurrenceWeekdays",
  weekly: "habits.recurrenceWeekly",
  custom: "habits.recurrenceCustom",
};

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function deriveMode(rule: RecurrenceRule): RecurrenceMode {
  if (rule.frequency === "daily") return "daily";
  if (rule.frequency === "custom") return "custom";
  if (rule.frequency === "weekly") {
    return (rule.byWeekday?.length ?? 0) > 1 ? "weekdays" : "weekly";
  }
  return "daily";
}

export function HabitForm({ habit, onSaved, onCancel }: HabitFormProps) {
  const { t } = useTranslation();
  const now = useNow();
  const isEdit = Boolean(habit);

  const [title, setTitle] = useState(habit?.title ?? "");
  const [titleError, setTitleError] = useState<string | undefined>();

  const [mode, setMode] = useState<RecurrenceMode>(habit ? deriveMode(habit.recurrence) : "daily");
  const [selectedDays, setSelectedDays] = useState<number[]>(
    habit?.recurrence.byWeekday ?? [now.getDay()],
  );
  const [weekdayError, setWeekdayError] = useState<string | undefined>();

  const [timeEnabled, setTimeEnabled] = useState(Boolean(habit?.timeOfDay));
  const [time, setTime] = useState(habit?.timeOfDay ?? "");

  const [targetEnabled, setTargetEnabled] = useState(Boolean(habit?.target));
  const [targetType, setTargetType] = useState<HabitTarget["type"]>(habit?.target?.type ?? "count");
  const [targetValue, setTargetValue] = useState(
    habit?.target?.value != null ? String(habit.target.value) : "",
  );
  const [targetUnit, setTargetUnit] = useState(habit?.target?.unit ?? "");
  const [reminders, setReminders] = useState<Reminder[]>(habit?.reminders ?? []);
  const [lifeAreaId, setLifeAreaId] = useState<string>(habit?.lifeAreaId ?? "");
  const [goalId, setGoalId] = useState<string>(habit?.goalId ?? "");
  const areas = useLifeAreas() ?? [];
  const goals = useGoals() ?? [];
  const areaGoals = goals.filter((g) => !g.sync.deletedAt && (!lifeAreaId || g.lifeAreaId === lifeAreaId));

  const [saving, setSaving] = useState(false);

  function toggleDay(day: number) {
    setWeekdayError(undefined);
    if (mode === "weekly") {
      setSelectedDays([day]);
      return;
    }
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b),
    );
  }

  function selectMode(next: RecurrenceMode) {
    setMode(next);
    setWeekdayError(undefined);
    if (next === "weekly" && selectedDays.length !== 1) {
      setSelectedDays([selectedDays[0] ?? now.getDay()]);
    }
  }

  function buildRecurrence(): RecurrenceRule {
    if (mode === "daily") return { frequency: "daily", interval: 1 };
    if (mode === "custom") return { frequency: "custom", interval: 1 };
    return { frequency: "weekly", interval: 1, byWeekday: [...selectedDays].sort((a, b) => a - b) };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setTitleError(t("habits.fieldTitlePlaceholder"));
      return;
    }
    setTitleError(undefined);

    if (mode === "weekdays" && selectedDays.length === 0) {
      setWeekdayError(t("habits.selectDayError"));
      return;
    }
    setWeekdayError(undefined);

    const recurrence = buildRecurrence();
    const numericTarget = Number(targetValue);
    const target: HabitTarget | null = targetEnabled
      ? {
          type: targetType,
          value: Number.isFinite(numericTarget) && numericTarget >= 1 ? Math.round(numericTarget) : 1,
          unit: targetType === "count" && targetUnit.trim() ? targetUnit.trim() : undefined,
        }
      : null;
    const timeOfDay = timeEnabled && time ? time : null;

    setSaving(true);
    try {
      if (habit) {
        const updated = await habitsRepository.update(habit.id, {
          title: trimmedTitle,
          recurrence,
          timeOfDay,
          target,
          reminders,
          lifeAreaId: lifeAreaId || null,
          goalId: goalId || null,
          trackerKind: habit.trackerKind ?? null,
        });
        await onEntityMutated({ type: "habit", op: "update", entity: updated });
      } else {
        const newHabit: Habit = {
          id: generateId(),
          title: trimmedTitle,
          recurrence,
          timeOfDay,
          target,
          reminders,
          lifeAreaId: lifeAreaId || null,
          goalId: goalId || null,
          trackerKind: null,
          sync: createSyncMeta(),
        };
        await habitsRepository.create(newHabit);
        await onEntityMutated({ type: "habit", op: "create", entity: newHabit });
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-5">
      <Input
        label={t("habits.fieldTitle")}
        placeholder={t("habits.fieldTitlePlaceholder")}
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          if (titleError) setTitleError(undefined);
        }}
        error={titleError}
        autoFocus={!isEdit}
        required
      />

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-text-secondary">{t("habits.fieldRecurrence")}</span>
        <div className="flex flex-wrap gap-2">
          {RECURRENCE_MODES.map((m) => (
            <Chip key={m} selected={mode === m} onClick={() => selectMode(m)}>
              {t(RECURRENCE_MODE_LABEL_KEY[m])}
            </Chip>
          ))}
        </div>
        {(mode === "weekly" || mode === "weekdays") && (
          <div className="flex flex-col gap-1.5 pt-1">
            <div className="flex flex-wrap gap-2">
              {WEEKDAY_KEYS.map((key, index) => (
                <Chip key={key} selected={selectedDays.includes(index)} onClick={() => toggleDay(index)}>
                  {t(`weekdays.${key}`)}
                </Chip>
              ))}
            </div>
            {weekdayError && <span className="text-xs text-danger">{weekdayError}</span>}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-text-secondary">{t("habits.fieldTime")}</span>
          <Switch checked={timeEnabled} onCheckedChange={setTimeEnabled} label={t("habits.fieldTime")} />
        </div>
        {timeEnabled && (
          <TimePicker value={time} onChange={(e) => setTime(e.target.value)} required />
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-text-secondary">{t("habits.fieldTarget")}</span>
          <Switch
            checked={targetEnabled}
            onCheckedChange={setTargetEnabled}
            label={t("habits.fieldTarget")}
          />
        </div>
        {targetEnabled && (
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <Chip selected={targetType === "count"} onClick={() => setTargetType("count")}>
                {t("habits.targetCount")}
              </Chip>
              <Chip selected={targetType === "duration"} onClick={() => setTargetType("duration")}>
                {t("habits.targetDuration")}
              </Chip>
            </div>
            <Input
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              required
              label={targetType === "count" ? t("habits.targetCount") : t("habits.targetDuration")}
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
            />
            {targetType === "count" && (
              <Input
                label={t("habits.targetUnit")}
                value={targetUnit}
                onChange={(e) => setTargetUnit(e.target.value)}
              />
            )}
          </div>
        )}
      </div>

      <ReminderEditor value={reminders} onChange={setReminders} />

      {areas.length > 0 && (
        <Select
          label={t("goals.fieldArea")}
          value={lifeAreaId}
          onChange={(e) => {
            setLifeAreaId(e.target.value);
            setGoalId("");
          }}
          options={[
            { value: "", label: t("goals.noArea") },
            ...areas.map((a) => ({ value: a.id, label: a.name })),
          ]}
        />
      )}
      {areaGoals.length > 0 && (
        <Select
          label={t("goals.pageTitle")}
          value={goalId}
          onChange={(e) => setGoalId(e.target.value)}
          options={[
            { value: "", label: t("goals.noArea") },
            ...areaGoals.map((g) => ({ value: g.id, label: g.title })),
          ]}
        />
      )}

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="secondary" fullWidth onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" fullWidth loading={saving}>
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
}
