"use client";

import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/Input";
import { DatePicker } from "@/components/ui/DatePicker";
import { TimePicker } from "@/components/ui/TimePicker";
import { Select, type SelectOption } from "@/components/ui/Select";
import { Chip } from "@/components/ui/Chip";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { ConflictBanner } from "./ConflictBanner";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { localCalendarService } from "@/lib/services/calendar/LocalCalendarService";
import type { CalendarEventInput } from "@/lib/services/calendar/ICalendarService";
import { combineDateAndTime, dateKey } from "@/lib/time/dateUtils";
import { generateId } from "@/lib/utils/id";
import type { Appointment, RecurrenceRule, Reminder } from "@/lib/types";

type RecurrenceOption = "none" | "daily" | "weekly" | "custom";
type ReminderOption = "none" | "at" | "15" | "30" | "60";

export interface AppointmentFormProps {
  /** When provided, the form edits this appointment instead of creating a new one. */
  appointment?: Appointment;
  /** Date to prefill in create mode (ignored when editing). */
  initialDate: Date;
  /** "HH:MM" start time to prefill in create mode (defaults to initialDate's time). */
  initialTime?: string;
  onSaved: (appointment: Appointment) => void;
  onCancel: () => void;
}

interface FormValues {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  notes: string;
  recurrenceFreq: RecurrenceOption;
  byWeekday: number[];
  reminderOption: ReminderOption;
}

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function toTimeInputValue(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = (((h * 60 + m + minutes) % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function recurrenceOptionFromRule(rule: RecurrenceRule | null | undefined): RecurrenceOption {
  if (!rule) return "none";
  if (rule.frequency === "daily") return "daily";
  if (rule.frequency === "weekly") return "weekly";
  // "monthly" isn't offered by this form; treat it as custom rather than losing the rule silently.
  return "custom";
}

function reminderOptionFromReminders(reminders: Reminder[]): ReminderOption {
  if (!reminders || reminders.length === 0) return "none";
  const offset = reminders[0].offsetMinutes;
  if (offset === 0) return "at";
  if (offset === 15) return "15";
  if (offset === 60) return "60";
  return "30";
}

function remindersFromOption(option: ReminderOption): Reminder[] {
  if (option === "none") return [];
  const offsetMinutes = option === "at" ? 0 : Number(option);
  return [{ id: generateId(), offsetMinutes, method: "inapp" }];
}

function buildRecurrenceRule(freq: RecurrenceOption, byWeekday: number[]): RecurrenceRule | null {
  if (freq === "none") return null;
  if (freq === "daily") return { frequency: "daily", interval: 1 };
  return { frequency: freq, interval: 1, byWeekday: byWeekday.length > 0 ? byWeekday : undefined };
}

export function AppointmentForm({
  appointment,
  initialDate,
  initialTime,
  onSaved,
  onCancel,
}: AppointmentFormProps) {
  const { t } = useTranslation();
  const toast = useToast();

  const [values, setValues] = useState<FormValues>(() => {
    if (appointment) {
      const start = new Date(appointment.startAt);
      const end = new Date(appointment.endAt);
      return {
        title: appointment.title,
        date: dateKey(start),
        startTime: toTimeInputValue(start),
        endTime: toTimeInputValue(end),
        location: appointment.location ?? "",
        notes: appointment.notes ?? "",
        recurrenceFreq: recurrenceOptionFromRule(appointment.recurrence),
        byWeekday: appointment.recurrence?.byWeekday ?? [start.getDay()],
        reminderOption: reminderOptionFromReminders(appointment.reminders),
      };
    }
    const startTime = initialTime ?? toTimeInputValue(initialDate);
    return {
      title: "",
      date: dateKey(initialDate),
      startTime,
      endTime: addMinutesToTime(startTime, 60),
      location: "",
      notes: "",
      recurrenceFreq: "none",
      byWeekday: [initialDate.getDay()],
      reminderOption: "30",
    };
  });

  const [endTimeError, setEndTimeError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [conflicts, setConflicts] = useState<Appointment[] | null>(null);
  const [pendingRange, setPendingRange] = useState<{ startAt: string; endAt: string } | null>(null);

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function toggleWeekday(day: number) {
    setValues((prev) => ({
      ...prev,
      byWeekday: prev.byWeekday.includes(day)
        ? prev.byWeekday.filter((d) => d !== day)
        : [...prev.byWeekday, day].sort((a, b) => a - b),
    }));
  }

  async function persist(startAt: string, endAt: string) {
    setSaving(true);
    try {
      const input: CalendarEventInput = {
        title: values.title.trim(),
        startAt,
        endAt,
        notes: values.notes.trim() || undefined,
        location: values.location.trim() || undefined,
        recurrence: buildRecurrenceRule(values.recurrenceFreq, values.byWeekday),
        reminders: remindersFromOption(values.reminderOption),
      };
      const saved = appointment
        ? await localCalendarService.updateEvent(appointment.id, input)
        : await localCalendarService.createEvent(input);
      toast.show(appointment ? t("common.updated") : t("common.saved"), { tone: "success" });
      onSaved(saved);
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setEndTimeError(false);

    const startAt = combineDateAndTime(values.date, values.startTime);
    const endAt = combineDateAndTime(values.date, values.endTime);

    if (new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      setEndTimeError(true);
      return;
    }

    const overlapping = await localCalendarService.listEvents({ start: startAt, end: endAt });
    const conflicting = overlapping.filter(
      (a) => a.id !== appointment?.id && a.startAt < endAt && a.endAt > startAt,
    );
    if (conflicting.length > 0) {
      setConflicts(conflicting);
      setPendingRange({ startAt, endAt });
      return;
    }

    await persist(startAt, endAt);
  }

  async function handleSaveAnyway() {
    if (!pendingRange) return;
    setConflicts(null);
    await persist(pendingRange.startAt, pendingRange.endAt);
  }

  const recurrenceOptions: SelectOption[] = [
    { value: "none", label: t("appointments.recurrenceNone") },
    { value: "daily", label: t("appointments.recurrenceDaily") },
    { value: "weekly", label: t("appointments.recurrenceWeekly") },
    { value: "custom", label: t("appointments.recurrenceCustom") },
  ];

  const reminderOptions: SelectOption[] = [
    { value: "none", label: t("appointments.reminderNone") },
    { value: "at", label: t("appointments.reminderAtTime") },
    { value: "15", label: t("appointments.reminderMinutesBefore", { minutes: 15 }) },
    { value: "30", label: t("appointments.reminderMinutesBefore", { minutes: 30 }) },
    { value: "60", label: t("appointments.reminderHoursBefore", { hours: 1 }) },
  ];

  const weekdayLabels = WEEKDAY_KEYS.map((key, index) => ({ index, label: t(`weekdays.${key}`) }));

  const showWeekdayPicker = values.recurrenceFreq === "weekly" || values.recurrenceFreq === "custom";

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
      <Input
        name="appointment-title"
        label={t("appointments.fieldTitle")}
        placeholder={t("appointments.fieldTitlePlaceholder")}
        value={values.title}
        onChange={(e) => update("title", e.target.value)}
        required
      />
      <DatePicker
        name="appointment-date"
        label={t("appointments.fieldDate")}
        value={values.date}
        onChange={(e) => update("date", e.target.value)}
        required
      />
      <div className="flex flex-col gap-1.5">
        <div className="grid grid-cols-2 gap-3">
          <TimePicker
            name="appointment-start-time"
            label={t("appointments.fieldStartTime")}
            value={values.startTime}
            onChange={(e) => update("startTime", e.target.value)}
            required
          />
          <TimePicker
            name="appointment-end-time"
            label={t("appointments.fieldEndTime")}
            value={values.endTime}
            onChange={(e) => update("endTime", e.target.value)}
            required
          />
        </div>
        {endTimeError && <span className="text-xs text-danger">{t("appointments.endTimeBeforeStart")}</span>}
      </div>
      <Select
        name="appointment-recurrence"
        label={t("appointments.fieldRecurrence")}
        options={recurrenceOptions}
        value={values.recurrenceFreq}
        onChange={(e) => update("recurrenceFreq", e.target.value as RecurrenceOption)}
      />
      {showWeekdayPicker && (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text-secondary">{t("appointments.repeatOn")}</span>
          <div className="flex flex-wrap gap-2">
            {weekdayLabels.map((w) => (
              <Chip
                key={w.index}
                type="button"
                selected={values.byWeekday.includes(w.index)}
                onClick={() => toggleWeekday(w.index)}
              >
                {w.label}
              </Chip>
            ))}
          </div>
        </div>
      )}
      <Select
        name="appointment-reminder"
        label={t("appointments.fieldReminder")}
        options={reminderOptions}
        value={values.reminderOption}
        onChange={(e) => update("reminderOption", e.target.value as ReminderOption)}
      />
      <Input
        name="appointment-location"
        label={t("appointments.fieldLocation")}
        value={values.location}
        onChange={(e) => update("location", e.target.value)}
      />
      <Textarea
        name="appointment-notes"
        label={t("appointments.fieldNotes")}
        value={values.notes}
        onChange={(e) => update("notes", e.target.value)}
        rows={3}
      />

      {conflicts && conflicts.length > 0 && (
        <ConflictBanner
          conflicts={conflicts}
          onGoBack={() => {
            setConflicts(null);
            setPendingRange(null);
          }}
          onSaveAnyway={() => void handleSaveAnyway()}
        />
      )}

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="secondary" fullWidth onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" variant="primary" fullWidth loading={saving}>
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
}
