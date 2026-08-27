import { addDays, addMonths, addWeeks, isBefore } from "date-fns";
import type { RecurrenceRule } from "@/lib/types";

export interface Occurrence {
  start: Date;
  end: Date;
}

function startOfWeekLocal(d: Date): Date {
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay());
  start.setHours(0, 0, 0, 0);
  return start;
}

const MAX_ITERATIONS = 2000;

/**
 * Expands a recurrence rule into concrete occurrences overlapping [rangeStart, rangeEnd).
 * Anchored at the original event's start/end; duration is preserved across occurrences.
 */
export function expandOccurrences(
  rule: RecurrenceRule | null | undefined,
  anchorStart: Date,
  anchorEnd: Date,
  rangeStart: Date,
  rangeEnd: Date,
): Occurrence[] {
  const durationMs = anchorEnd.getTime() - anchorStart.getTime();

  if (!rule) {
    return anchorStart < rangeEnd && anchorEnd > rangeStart
      ? [{ start: anchorStart, end: anchorEnd }]
      : [];
  }

  const until = rule.until ? new Date(rule.until) : null;
  const maxCount = rule.count ?? Infinity;
  const interval = Math.max(1, rule.interval || 1);
  const occurrences: Occurrence[] = [];
  let produced = 0;

  const tryPush = (start: Date): boolean => {
    if (isBefore(start, anchorStart)) return true;
    if (until && start > until) return false;
    if (produced >= maxCount) return false;
    produced += 1;
    const end = new Date(start.getTime() + durationMs);
    if (start < rangeEnd && end > rangeStart) {
      occurrences.push({ start, end });
    }
    return true;
  };

  if (rule.frequency === "daily") {
    let cursor = new Date(anchorStart);
    for (let i = 0; i < MAX_ITERATIONS && isBefore(cursor, rangeEnd); i++) {
      if (!tryPush(cursor)) break;
      cursor = addDays(cursor, interval);
    }
    return occurrences;
  }

  if (rule.frequency === "weekly" || rule.frequency === "custom") {
    const weekdays =
      rule.byWeekday && rule.byWeekday.length > 0 ? rule.byWeekday : [anchorStart.getDay()];
    let weekCursor = startOfWeekLocal(anchorStart);
    for (let i = 0; i < MAX_ITERATIONS && isBefore(weekCursor, rangeEnd); i++) {
      let anyKept = true;
      for (const wd of weekdays) {
        const dayOffset = (wd - weekCursor.getDay() + 7) % 7;
        const occStart = addDays(weekCursor, dayOffset);
        occStart.setHours(
          anchorStart.getHours(),
          anchorStart.getMinutes(),
          anchorStart.getSeconds(),
          0,
        );
        anyKept = tryPush(occStart) && anyKept;
      }
      if (!anyKept && produced >= maxCount) break;
      weekCursor = addWeeks(weekCursor, interval);
    }
    return occurrences;
  }

  if (rule.frequency === "monthly") {
    let cursor = new Date(anchorStart);
    for (let i = 0; i < MAX_ITERATIONS && isBefore(cursor, rangeEnd); i++) {
      if (!tryPush(cursor)) break;
      cursor = addMonths(cursor, interval);
    }
    return occurrences;
  }

  return occurrences;
}

/** Whether the recurrence rule produces an occurrence on the given calendar day. */
export function isDueOnDate(rule: RecurrenceRule, anchor: Date, date: Date): boolean {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const anchorDayStart = new Date(anchor);
  anchorDayStart.setHours(0, 0, 0, 0);
  // Occurrences here are zero-duration markers (start === end); the overlap check in
  // tryPush (`end > rangeStart`) would exclude one that lands exactly on dayStart, so
  // nudge the query's rangeStart back 1ms to make that boundary inclusive.
  const queryStart = new Date(dayStart.getTime() - 1);
  return expandOccurrences(rule, anchorDayStart, anchorDayStart, queryStart, dayEnd).length > 0;
}
