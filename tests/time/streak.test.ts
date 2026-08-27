import { describe, expect, it } from "vitest";
import { computeHabitStats } from "@/lib/time/streak";
import { dateKey } from "@/lib/time/dateUtils";
import type { HabitCompletion } from "@/lib/types";
import { addDays } from "date-fns";

function completion(date: string): HabitCompletion {
  return {
    id: date,
    habitId: "h1",
    date,
    completedAt: `${date}T09:00:00.000Z`,
    sync: { createdAt: "", updatedAt: "", syncStatus: "pending", version: 1 },
  };
}

describe("computeHabitStats", () => {
  const today = new Date(2026, 7, 26); // Wednesday
  const anchor = addDays(today, -30);
  const dailyRule = { frequency: "daily" as const, interval: 1 };

  it("counts a perfect streak up to and including today", () => {
    const completions = [-2, -1, 0].map((offset) => completion(dateKey(addDays(today, offset))));
    const stats = computeHabitStats(dailyRule, anchor, completions, today);
    expect(stats.current).toBe(3);
  });

  it("completion rate is measured over the full history since the habit's anchor, not just the streak", () => {
    // Anchored exactly 3 days ago, completed all 3 due days -> 100%.
    const recentAnchor = addDays(today, -2);
    const completions = [-2, -1, 0].map((offset) => completion(dateKey(addDays(today, offset))));
    const stats = computeHabitStats(dailyRule, recentAnchor, completions, today);
    expect(stats.completionRate).toBe(1);
  });

  it("does not break the streak just because today isn't completed yet", () => {
    const completions = [-3, -2, -1].map((offset) => completion(dateKey(addDays(today, offset))));
    const stats = computeHabitStats(dailyRule, anchor, completions, today);
    expect(stats.current).toBe(3);
  });

  it("breaks the streak on a genuinely missed past day", () => {
    // Missed 2 days ago, completed yesterday and today.
    const completions = [-1, 0].map((offset) => completion(dateKey(addDays(today, offset))));
    const stats = computeHabitStats(dailyRule, anchor, completions, today);
    expect(stats.current).toBe(2);
  });

  it("longest streak can exceed the current streak", () => {
    // A 5-day streak two weeks ago, nothing since.
    const completions = [-20, -19, -18, -17, -16].map((offset) => completion(dateKey(addDays(today, offset))));
    const stats = computeHabitStats(dailyRule, anchor, completions, today);
    expect(stats.longest).toBe(5);
    expect(stats.current).toBe(0);
  });

  it("returns zeroed stats when there are no expected occurrences yet", () => {
    const futureAnchor = addDays(today, 5);
    const stats = computeHabitStats(dailyRule, futureAnchor, [], today);
    expect(stats).toEqual({ current: 0, longest: 0, completionRate: 0 });
  });
});
