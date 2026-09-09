/**
 * Deterministic Smart Rescheduling — pure function, no network, no AI.
 *
 * Given the day's plan (from `buildLocalPlan`) and the time left, it proposes a
 * small set of safe, reversible actions:
 *   • `moveItemToBucket`     — a task/habit whose time window has passed → the
 *                              current window, so it stops looking "overdue"
 *   • `deferTaskToTomorrow`  — a task that genuinely can't fit the time left
 *
 * Guarantees (enforced here, re-checked by the pipeline + policy):
 *   • never proposes deleting anything
 *   • never touches an appointment
 *   • respects priority (overflow is the lowest-ranked work first)
 *   • respects the time left + energy (via `buildLocalPlan`'s ranking/duration)
 *   • loop-safe: caps runs/day and never re-proposes for an item already acted on
 *
 * The output is raw action objects ready for `processActions()`.
 */

import { buildLocalPlan, type PlannerInput, type Bucket } from "./localPlanner";

export const MAX_RESCHEDULES_PER_DAY = 6;

export interface RescheduleInput extends PlannerInput {
  /** How many times reschedule has already run today (loop guard). */
  runsToday?: number;
  /** `${refType}:${refId}` keys already moved/deferred today (per-item loop guard). */
  touchedKeys?: Set<string>;
}

export interface RescheduleProposal {
  kind: "moveItemToBucket" | "deferTaskToTomorrow";
  reason: string;
  // moveItemToBucket
  refType?: "task" | "habit";
  refId?: string;
  bucket?: Bucket;
  // deferTaskToTomorrow
  taskId?: string;
}

export interface RescheduleResult {
  proposals: RescheduleProposal[];
  summary: {
    minutesLeft: number;
    fitsCount: number;
    overflowCount: number;
    movedCount: number;
  };
  /** why nothing (more) was proposed */
  note: "ok" | "clear" | "loop-guard";
}

function bucketForHour(hour: number): Bucket {
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

const BUCKET_ORDER: Record<Bucket, number> = { morning: 0, afternoon: 1, evening: 2 };
const BUCKET_AR: Record<Bucket, string> = { morning: "الصباح", afternoon: "الظهر", evening: "المساء" };

export function planReschedule(input: RescheduleInput): RescheduleResult {
  const now = input.now;
  const runsToday = input.runsToday ?? 0;
  const touched = input.touchedKeys ?? new Set<string>();
  const dayEndHour = input.dayEndHour ?? 22;

  const dayEnd = new Date(now);
  dayEnd.setHours(dayEndHour, 0, 0, 0);
  const minutesLeft = Math.max(0, Math.round((dayEnd.getTime() - now.getTime()) / 60_000));
  const nowBucket = bucketForHour(now.getHours());

  const plan = buildLocalPlan(input);

  if (runsToday >= MAX_RESCHEDULES_PER_DAY) {
    return {
      proposals: [],
      summary: { minutesLeft, fitsCount: 0, overflowCount: 0, movedCount: 0 },
      note: "loop-guard",
    };
  }

  const proposals: RescheduleProposal[] = [];
  let movedCount = 0;

  // 1) items stuck in a past window → move them to the current window
  for (const item of plan.remaining) {
    if (item.type === "appointment") continue;
    if (item.at) continue; // time-anchored items keep their time
    const key = `${item.type}:${item.id}`;
    if (touched.has(key)) continue;
    if (BUCKET_ORDER[item.bucket] < BUCKET_ORDER[nowBucket]) {
      proposals.push({
        kind: "moveItemToBucket",
        refType: item.type,
        refId: item.id,
        bucket: nowBucket,
        reason: `انتقل وقت ${BUCKET_AR[item.bucket]} — ننقلها إلى ${BUCKET_AR[nowBucket]}`,
      });
      movedCount++;
    }
  }

  // 2) walk the remaining work against the time budget; overflow tasks → tomorrow
  let budget = minutesLeft;
  let fitsCount = 0;
  let overflowCount = 0;
  for (const item of plan.remaining) {
    if (item.type === "appointment") {
      budget -= item.durationMinutes;
      continue;
    }
    if (budget - item.durationMinutes >= 0) {
      budget -= item.durationMinutes;
      fitsCount++;
      continue;
    }
    overflowCount++;
    if (item.type !== "task") continue; // a habit just isn't done today — never "deferred"
    const key = `task:${item.id}`;
    if (touched.has(key)) continue;
    proposals.push({
      kind: "deferTaskToTomorrow",
      taskId: item.id,
      reason:
        minutesLeft <= 0
          ? "انتهى وقت اليوم — ننقلها للغد وتبقى كما هي"
          : `مدّتها ${item.durationMinutes} دقيقة ولا يتّسع لها ما تبقّى من اليوم`,
    });
  }

  const note: RescheduleResult["note"] =
    proposals.length > 0 ? "ok" : overflowCount === 0 && movedCount === 0 ? "clear" : "ok";

  return {
    proposals,
    summary: { minutesLeft, fitsCount, overflowCount, movedCount },
    note,
  };
}
