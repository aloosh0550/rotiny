import { addDays } from "date-fns";
import type { HabitCompletion, RecurrenceRule } from "@/lib/types";
import { expandOccurrences } from "./recurrence";
import { dateKey } from "./dateUtils";

export interface HabitStats {
  current: number;
  longest: number;
  completionRate: number; // 0..1, over expected days up to today
}

export function getExpectedDateKeys(
  rule: RecurrenceRule,
  anchor: Date,
  rangeStart: Date,
  rangeEnd: Date,
): string[] {
  const occurrences = expandOccurrences(rule, anchor, anchor, rangeStart, rangeEnd);
  return occurrences.map((o) => dateKey(o.start)).sort();
}

export function computeHabitStats(
  rule: RecurrenceRule,
  anchor: Date,
  completions: HabitCompletion[],
  today: Date = new Date(),
): HabitStats {
  const completedSet = new Set(completions.map((c) => c.date));
  const lookback = addDays(today, -365);
  const rangeStart = anchor > lookback ? anchor : lookback;
  const expected = getExpectedDateKeys(rule, anchor, rangeStart, addDays(today, 1));

  if (expected.length === 0) {
    return { current: 0, longest: 0, completionRate: 0 };
  }

  const todayKeyStr = dateKey(today);
  const dueExpected = expected.filter((k) => k <= todayKeyStr);
  const completedCount = dueExpected.filter((k) => completedSet.has(k)).length;
  const completionRate = dueExpected.length > 0 ? completedCount / dueExpected.length : 0;

  let longest = 0;
  let run = 0;
  for (const k of expected) {
    if (completedSet.has(k)) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  }

  let current = 0;
  for (let i = dueExpected.length - 1; i >= 0; i--) {
    const k = dueExpected[i];
    if (completedSet.has(k)) {
      current += 1;
      continue;
    }
    if (k === todayKeyStr) continue;
    break;
  }

  return { current, longest, completionRate };
}
