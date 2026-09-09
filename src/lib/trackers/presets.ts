import type { Habit, HabitTarget, RecurrenceRule, TrackerKind } from "@/lib/types";
import { generateId } from "@/lib/utils/id";
import { createSyncMeta } from "@/lib/utils/sync";

const DAILY: RecurrenceRule = { frequency: "daily", interval: 1 };

interface PresetDef {
  kind: TrackerKind;
  /** i18n key under `trackers.*` for the default title */
  titleKey: string;
  target: HabitTarget;
  recurrence: RecurrenceRule;
  timeOfDay?: string | null;
}

export const TRACKER_PRESETS: Record<TrackerKind, PresetDef> = {
  water: {
    kind: "water",
    titleKey: "trackers.water",
    target: { type: "count", value: 8, unit: "كوب" },
    recurrence: DAILY,
  },
  exercise: {
    kind: "exercise",
    titleKey: "trackers.exercise",
    // 5 days/week — weekly with 5 explicit weekdays (Sun–Thu)
    target: { type: "duration", value: 30 },
    recurrence: { frequency: "weekly", interval: 1, byWeekday: [0, 1, 2, 3, 4] },
    timeOfDay: "17:00",
  },
  reading: {
    kind: "reading",
    titleKey: "trackers.reading",
    target: { type: "count", value: 20, unit: "صفحة" },
    recurrence: DAILY,
  },
  skill: {
    kind: "skill",
    titleKey: "trackers.skill",
    target: { type: "duration", value: 20 },
    recurrence: DAILY,
  },
};

export const TRACKER_ORDER: TrackerKind[] = ["water", "exercise", "reading", "skill"];

/** Build a Habit for a tracker preset (title overridable). */
export function habitFromPreset(kind: TrackerKind, title: string): Habit {
  const p = TRACKER_PRESETS[kind];
  return {
    id: generateId(),
    title: title.trim() || title,
    recurrence: p.recurrence,
    timeOfDay: p.timeOfDay ?? null,
    target: p.target,
    reminders: [],
    trackerKind: kind,
    sync: createSyncMeta(),
  };
}
