import type {
  Habit,
  HabitTarget,
  Locale,
  ParsedIntent,
  Priority,
  RecurrenceRule,
  Reminder,
  Task,
} from "@/lib/types";
import { ruleBasedIntentParser } from "@/lib/services/nlp";
import { habitsRepository, tasksRepository } from "@/lib/db/repositories";
import { localCalendarService } from "@/lib/services/calendar/LocalCalendarService";
import { onEntityMutated } from "@/lib/services/effects/appEffects";
import { generateId } from "@/lib/utils/id";
import { createSyncMeta } from "@/lib/utils/sync";
import { combineDateAndTime, todayKey } from "@/lib/time/dateUtils";

export type SmartEntityType = "task" | "appointment" | "habit" | "search";

/** An editable, reviewable interpretation of a natural-language phrase. */
export interface Interpretation {
  entityType: SmartEntityType;
  /** True when confidence is below the user's threshold, the intent was unknown,
   * or the parser asked for a clarification — the UI must show the confirm step. */
  needsConfirmation: boolean;
  confidence: number;
  raw: string;
  locale: Locale;
  title: string;
  date: string | null; // YYYY-MM-DD
  time: string | null; // HH:mm
  durationMinutes: number | null;
  priority: Priority;
  recurrence: RecurrenceRule | null;
  reminders: Reminder[];
  /** Habit count target (unit + value). */
  countTarget: { value: number; unit: string } | null;
  participants: string[];
  parsed: ParsedIntent;
}

function remindersFromOffsets(offsets: number[]): Reminder[] {
  return offsets.map((o) => ({ id: generateId(), offsetMinutes: o, method: "push" as const }));
}

export const smartAddService = {
  /** Parse + shape into an Interpretation. Never invents a date/time that isn't in the text. */
  interpret(text: string, opts: { locale: Locale; confidenceThreshold: number }): Interpretation {
    const parsed = ruleBasedIntentParser.parse(text, { locale: opts.locale });

    const entityType: SmartEntityType =
      parsed.intentType === "create_appointment"
        ? "appointment"
        : parsed.intentType === "create_habit"
          ? "habit"
          : parsed.intentType === "search_query"
            ? "search"
            : "task";

    const defaultReminderOffsets =
      parsed.reminderOffsetMinutes != null
        ? [parsed.reminderOffsetMinutes.value]
        : entityType === "appointment"
          ? [30]
          : [];

    return {
      entityType,
      needsConfirmation:
        parsed.intentType === "unknown" ||
        parsed.clarifications.length > 0 ||
        parsed.confidence < opts.confidenceThreshold,
      confidence: parsed.confidence,
      raw: text,
      locale: opts.locale,
      title: parsed.title.value.trim() || text.trim(),
      date: parsed.date?.value ?? null,
      time: parsed.time?.value ?? null,
      durationMinutes: parsed.durationMinutes?.value ?? null,
      priority: parsed.priority?.value ?? "normal",
      recurrence: parsed.recurrence?.value ?? null,
      reminders: remindersFromOffsets(defaultReminderOffsets),
      countTarget: parsed.countTarget?.value ?? null,
      participants: parsed.entities.filter((e) => e.type === "person").map((e) => e.value),
      parsed,
    };
  },

  /** Persist the (possibly user-edited) interpretation. Routes appointments through
   * the calendar service so device-calendar sync happens in one step. */
  async commit(i: Interpretation): Promise<{ entityType: SmartEntityType; id: string | null }> {
    if (i.entityType === "search") {
      return { entityType: "search", id: null };
    }

    if (i.entityType === "appointment") {
      const day = i.date || todayKey();
      const startTime = i.time || "09:00";
      const startAt = combineDateAndTime(day, startTime);
      const durationMinutes = i.durationMinutes ?? 60;
      const endAt = new Date(new Date(startAt).getTime() + durationMinutes * 60_000).toISOString();
      const saved = await localCalendarService.createEvent({
        title: i.title,
        startAt,
        endAt,
        recurrence: i.recurrence,
        reminders: i.reminders,
        participants: i.participants.length ? i.participants : undefined,
      });
      await onEntityMutated({ type: "appointment", op: "create", entity: saved });
      return { entityType: "appointment", id: saved.id };
    }

    if (i.entityType === "habit") {
      let target: HabitTarget | null = null;
      if (i.countTarget) target = { type: "count", value: i.countTarget.value, unit: i.countTarget.unit };
      else if (i.durationMinutes) target = { type: "duration", value: i.durationMinutes };
      const recurrence: RecurrenceRule = i.recurrence ?? { frequency: "daily", interval: 1 };
      const habit: Habit = {
        id: generateId(),
        title: i.title,
        recurrence,
        timeOfDay: i.time ?? null,
        target,
        reminders: i.reminders,
        sync: createSyncMeta(),
      };
      await habitsRepository.create(habit);
      await onEntityMutated({ type: "habit", op: "create", entity: habit });
      return { entityType: "habit", id: habit.id };
    }

    // task
    const dueAt = i.date ? combineDateAndTime(i.date, i.time || "09:00") : null;
    const task: Task = {
      id: generateId(),
      title: i.title,
      dueAt,
      hasTime: Boolean(i.time),
      durationMinutes: i.durationMinutes,
      priority: i.priority,
      status: "pending",
      recurrence: i.recurrence,
      reminders: i.reminders,
      categoryId: null,
      pinned: false,
      sync: createSyncMeta(),
    };
    await tasksRepository.create(task);
    await onEntityMutated({ type: "task", op: "create", entity: task });
    return { entityType: "task", id: task.id };
  },
};