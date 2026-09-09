/**
 * المخطط الذكي — Local Planner (deterministic, no network, no LLM).
 *
 * Answers "ماذا أفعل الآن؟ وماذا بعده؟" from the day's tasks, appointments and
 * habits + the user's self-reported energy. Pure function — fully unit-tested,
 * runs offline, and is the always-on engine. When (later) an AI provider is
 * available it *upgrades* the ranking; it is never required.
 *
 * Ranking is intentionally simple and explainable — every item carries a
 * `reason` string shown to the user. Language is calm and non-judgemental
 * (never "فشلت" / "متأخر ومقصّر").
 */

import type { Appointment, Habit, HabitCompletion, Task } from "@/lib/types";
import { isDueOnDate } from "@/lib/time/recurrence";

export type EnergyLevel = "high" | "good" | "medium" | "low";
export type Bucket = "morning" | "afternoon" | "evening";

export interface PlannerInput {
  now: Date;
  energy?: EnergyLevel | null;
  tasks: Task[];
  appointments: Appointment[];
  habits: Habit[];
  /** Today's habit completions (any date key works; only today's are used). */
  habitCompletions: HabitCompletion[];
  /** Hour the day is considered "over" for planning. Default 22. */
  dayEndHour?: number;
}

export interface PlanItem {
  type: "task" | "appointment" | "habit";
  id: string;
  title: string;
  /** ISO start, when the item is time-anchored. */
  at: string | null;
  durationMinutes: number;
  bucket: Bucket;
  reason: string;
  score: number;
}

export interface LocalPlan {
  /** The single thing to do now (or null if the day is clear). */
  now: PlanItem | null;
  /** The thing after that. */
  next: PlanItem | null;
  buckets: Record<Bucket, PlanItem[]>;
  /** Everything still to do, best-first (fixed-time items kept in time order). */
  remaining: PlanItem[];
  overload: {
    plannedMinutes: number;
    availableMinutes: number;
    over: boolean;
  };
}

const DEFAULT_TASK_MINUTES = 30;
const DEFAULT_HABIT_MINUTES = 15;
const DEFAULT_APPT_MINUTES = 60;

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** local YYYY-MM-DD for a Date (matches `todayKey()` in dateUtils). */
function localKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function bucketForHour(hour: number): Bucket {
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

/** Low energy → favour short/light items; high energy → tolerate heavy ones. */
function energyAdjust(
  energy: EnergyLevel | null | undefined,
  durationMinutes: number,
  cost?: "low" | "med" | "high" | null,
): number {
  if (!energy || energy === "good" || energy === "medium") return 0;

  if (energy === "low") {
    let adj = durationMinutes > 45 ? -35 : durationMinutes <= 15 ? 12 : 0;
    if (cost === "high") adj -= 30;
    else if (cost === "low") adj += 15;
    return adj;
  }
  // high energy — lean into the heavy work
  let adj = durationMinutes > 45 ? 15 : 0;
  if (cost === "high") adj += 15;
  return adj;
}

function taskDuration(t: Task): number {
  return t.durationMinutes && t.durationMinutes > 0 ? t.durationMinutes : DEFAULT_TASK_MINUTES;
}

function scoreTask(t: Task, now: Date, energy: EnergyLevel | null | undefined): { score: number; reason: string } {
  let score = t.priority === "important" ? 100 : t.priority === "later" ? 20 : 50;
  let reason = "التالي في قائمتك";

  if (t.pinned) {
    // "أهم مهمة" is a deliberate user choice — it outranks priority alone.
    score += 60;
    reason = "ثبّتّها كأهم مهمة";
  }

  if (t.dueAt) {
    const due = new Date(t.dueAt);
    const hoursToDue = (due.getTime() - now.getTime()) / 3_600_000;
    if (hoursToDue < 0) {
      score += 70;
      reason = "تجاوز وقتها — أنجزها متى ما تيسّر";
    } else if (sameDay(due, now)) {
      score += 45;
      reason = t.priority === "important" ? "مهمة ومطلوبة اليوم" : "مطلوبة اليوم";
    } else if (hoursToDue < 48) {
      score += 18;
      reason = "موعدها قريب";
    }
  }

  const adj = energyAdjust(energy, taskDuration(t), t.energyCost);
  if (adj > 0 && !t.pinned && !t.dueAt) reason = "خفيفة ومناسبة لطاقتك الآن";
  score += adj;

  return { score, reason };
}

/**
 * Build a deterministic day plan. Time-anchored appointments come first and are
 * never moved; tasks and habits are ranked and distributed into buckets.
 */
export function buildLocalPlan(input: PlannerInput): LocalPlan {
  const { now, energy, tasks, appointments, habits, habitCompletions } = input;
  const dayEndHour = input.dayEndHour ?? 22;

  const items: PlanItem[] = [];

  // --- appointments today, not yet finished -------------------------------
  for (const a of appointments) {
    const start = new Date(a.startAt);
    const end = new Date(a.endAt);
    if (!sameDay(start, now)) continue;
    if (end.getTime() <= now.getTime()) continue;
    const minutesToStart = (start.getTime() - now.getTime()) / 60_000;
    const ongoing = start.getTime() <= now.getTime() && end.getTime() > now.getTime();
    items.push({
      type: "appointment",
      id: a.id,
      title: a.title,
      at: a.startAt,
      durationMinutes: Math.max(
        5,
        Math.round((end.getTime() - start.getTime()) / 60_000) || DEFAULT_APPT_MINUTES,
      ),
      bucket: bucketForHour(start.getHours()),
      reason: ongoing
        ? "موعدك الآن"
        : minutesToStart <= 60
          ? `موعدك بعد ${Math.max(1, Math.round(minutesToStart))} دقيقة`
          : "موعد اليوم",
      // huge base so a fixed appointment always leads its time window
      score: 1000 - minutesToStart,
    });
  }

  // --- pending tasks -----------------------------------------------------
  const dayKey = localKey(now);
  for (const t of tasks) {
    if (t.status !== "pending") continue;
    // a task deliberately planned for a later day is not part of *today's* plan
    // (deferring a task to tomorrow sets `plannedFor` — see ai/pipeline.ts)
    if (t.plannedFor && t.plannedFor > dayKey) continue;
    const { score, reason } = scoreTask(t, now, energy);
    const at = t.hasTime && t.dueAt ? t.dueAt : null;
    const hour = at ? new Date(at).getHours() : now.getHours();
    items.push({
      type: "task",
      id: t.id,
      title: t.title,
      at,
      durationMinutes: taskDuration(t),
      bucket: bucketForHour(hour),
      reason,
      score,
    });
  }

  // --- habits due today, not completed ---------------------------------
  const doneHabitIds = new Set(
    habitCompletions
      .filter((c) => sameDay(new Date(`${c.date}T00:00:00`), now))
      .map((c) => c.habitId),
  );
  for (const h of habits) {
    if (h.archivedAt) continue;
    if (doneHabitIds.has(h.id)) continue;
    const anchor = new Date(h.sync.createdAt);
    if (!isDueOnDate(h.recurrence, anchor, now)) continue;
    const at =
      h.timeOfDay != null
        ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T${h.timeOfDay}:00`
        : null;
    const hour = at ? new Date(at).getHours() : now.getHours();
    const dur = h.target?.type === "duration" ? h.target.value : DEFAULT_HABIT_MINUTES;
    items.push({
      type: "habit",
      id: h.id,
      title: h.title,
      at,
      durationMinutes: dur,
      bucket: bucketForHour(hour),
      reason: "عادة اليوم",
      score: 42 + (at ? 8 : 0) + energyAdjust(energy, dur),
    });
  }

  // --- ordering -------------------------------------------------------
  // "remaining" = fixed-time items in chronological order, then the rest by score.
  const timed = items.filter((i) => i.at).sort((a, b) => (a.at! < b.at! ? -1 : 1));
  const untimed = items.filter((i) => !i.at).sort((a, b) => b.score - a.score);
  const remaining = [...timed, ...untimed];

  // "now": an ongoing/imminent appointment wins; else the top-scored item.
  const imminentAppt = timed.find(
    (i) => i.type === "appointment" && new Date(i.at!).getTime() - now.getTime() <= 60 * 60_000,
  );
  const ranked = [...items].sort((a, b) => b.score - a.score);
  const nowItem = imminentAppt ?? ranked[0] ?? null;
  const nextItem = remaining.find((i) => i !== nowItem) ?? null;

  // buckets
  const buckets: Record<Bucket, PlanItem[]> = { morning: [], afternoon: [], evening: [] };
  for (const i of remaining) buckets[i.bucket].push(i);

  // overload: can the untimed work fit before dayEnd, around the appointments?
  const dayEnd = new Date(now);
  dayEnd.setHours(dayEndHour, 0, 0, 0);
  const minutesLeft = Math.max(0, (dayEnd.getTime() - now.getTime()) / 60_000);
  const apptMinutes = timed
    .filter((i) => i.type === "appointment")
    .reduce((s, i) => s + i.durationMinutes, 0);
  const workMinutes = untimed.reduce((s, i) => s + i.durationMinutes, 0);
  const availableMinutes = Math.max(0, minutesLeft - apptMinutes);

  return {
    now: nowItem,
    next: nextItem,
    buckets,
    remaining,
    overload: {
      plannedMinutes: Math.round(workMinutes),
      availableMinutes: Math.round(availableMinutes),
      over: workMinutes > availableMinutes,
    },
  };
}
