import type {
  DhikrProgress,
  Habit,
  HabitCompletion,
  LifeArea,
  Measurement,
  ReviewMetrics,
  ReviewPeriod,
  Task,
} from "@/lib/types";
import { isDueOnDate } from "@/lib/time/recurrence";
import { computeHabitStats } from "@/lib/time/streak";
import { datesInPeriod } from "./periods";

export interface ReviewInput {
  period: ReviewPeriod;
  periodKey: string;
  tasks: Task[];
  habits: Habit[];
  habitCompletions: HabitCompletion[];
  dhikrProgress: DhikrProgress[];
  measurements: Measurement[];
  lifeAreas: LifeArea[];
  /** compare against the previous period's completionPct (percentage points). */
  previousCompletionPct?: number;
}

function taskDateKey(t: Task): string | null {
  const iso = t.plannedFor ?? t.dueAt ?? (t.status === "completed" ? t.completedAt : null);
  return iso ? iso.slice(0, 10) : null;
}

/**
 * Deterministic review metrics. Every number is a direct count over the raw
 * rows for the period's date range — nothing estimated, nothing fabricated.
 */
export function computeReview(input: ReviewInput): ReviewMetrics {
  const dates = new Set(datesInPeriod(input.period, input.periodKey));
  const inRange = (key: string | null) => key != null && dates.has(key);

  // --- tasks ------------------------------------------------------------
  const periodTasks = input.tasks.filter(
    (t) => t.status !== "cancelled" && inRange(taskDateKey(t)),
  );
  const tasksDue = periodTasks.length;
  const tasksDone = periodTasks.filter((t) => t.status === "completed").length;

  // --- habits: expected occurrences vs completions in the range --------
  const completedByKey = new Map<string, Set<string>>(); // date -> habitIds
  for (const c of input.habitCompletions) {
    if (!dates.has(c.date)) continue;
    if (!completedByKey.has(c.date)) completedByKey.set(c.date, new Set());
    completedByKey.get(c.date)!.add(c.habitId);
  }
  let habitsDue = 0;
  let habitsDone = 0;
  for (const dk of dates) {
    const day = new Date(`${dk}T12:00:00`);
    for (const h of input.habits) {
      if (h.archivedAt) continue;
      if (!isDueOnDate(h.recurrence, new Date(h.sync.createdAt), day)) continue;
      habitsDue++;
      if (completedByKey.get(dk)?.has(h.id)) habitsDone++;
    }
  }

  // --- adhkar: days with any dhikr progress ---------------------------
  const adhkarDaySet = new Set(input.dhikrProgress.filter((p) => dates.has(p.date)).map((p) => p.date));

  const measurementsLogged = input.measurements.filter(
    (m) => dates.has(m.date) && m.value > 0,
  ).length;

  // --- overall completion -------------------------------------------
  const totalDone = tasksDone + habitsDone;
  const totalDue = tasksDue + habitsDue;
  const completionPct = totalDue > 0 ? Math.round((totalDone / totalDue) * 100) : 0;

  // --- best streak across all habits ------------------------------
  let bestStreak = 0;
  for (const h of input.habits) {
    const cs = input.habitCompletions.filter((c) => c.habitId === h.id);
    const stats = computeHabitStats(h.recurrence, new Date(h.sync.createdAt), cs);
    bestStreak = Math.max(bestStreak, stats.longest);
  }

  // --- per-area completion --------------------------------------
  const areas: Record<string, number> = {};
  for (const area of input.lifeAreas) {
    const aTasks = periodTasks.filter((t) => t.lifeAreaId === area.id);
    const aHabitIds = new Set(input.habits.filter((h) => h.lifeAreaId === area.id).map((h) => h.id));
    let aDue = aTasks.length;
    let aDone = aTasks.filter((t) => t.status === "completed").length;
    for (const dk of dates) {
      const day = new Date(`${dk}T12:00:00`);
      for (const h of input.habits) {
        if (!aHabitIds.has(h.id) || h.archivedAt) continue;
        if (!isDueOnDate(h.recurrence, new Date(h.sync.createdAt), day)) continue;
        aDue++;
        if (completedByKey.get(dk)?.has(h.id)) aDone++;
      }
    }
    if (aDue > 0) areas[area.key] = Math.round((aDone / aDue) * 100);
  }
  const areaEntries = Object.entries(areas);
  const strongestArea = areaEntries.length
    ? areaEntries.reduce((a, b) => (b[1] > a[1] ? b : a))[0]
    : null;
  const weakestArea = areaEntries.length
    ? areaEntries.reduce((a, b) => (b[1] < a[1] ? b : a))[0]
    : null;

  return {
    tasksDone,
    tasksDue,
    habitsDone,
    habitsDue,
    adhkarDays: adhkarDaySet.size,
    measurementsLogged,
    completionPct,
    deltaPct:
      input.previousCompletionPct != null ? completionPct - input.previousCompletionPct : undefined,
    bestStreak,
    areas,
    strongestArea,
    weakestArea,
  };
}
