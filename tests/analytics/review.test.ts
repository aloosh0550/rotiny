import { describe, expect, it } from "vitest";
import { weekKey, monthKey, datesInPeriod, previousPeriodKey } from "@/lib/analytics/periods";
import { computeReview } from "@/lib/analytics/review";
import type { Habit, HabitCompletion, Task } from "@/lib/types";

const SYNC = { createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "", deletedAt: null, syncStatus: "synced" as const, remoteId: null, version: 1 };

describe("period helpers", () => {
  it("weekKey / monthKey", () => {
    expect(monthKey(new Date(2026, 8, 15))).toBe("2026-09");
    expect(weekKey(new Date(2026, 0, 5))).toBe("2026-W02"); // Mon 5 Jan 2026 is ISO week 2
  });
  it("datesInPeriod month has the right number of days", () => {
    expect(datesInPeriod("month", "2026-02")).toHaveLength(28);
    expect(datesInPeriod("week", "2026-W02")).toHaveLength(7);
    expect(datesInPeriod("day", "2026-09-09")).toEqual(["2026-09-09"]);
  });
  it("previousPeriodKey", () => {
    expect(previousPeriodKey("day", "2026-09-01")).toBe("2026-08-31");
    expect(previousPeriodKey("month", "2026-01")).toBe("2025-12");
  });
});

describe("computeReview (deterministic)", () => {
  function task(p: Partial<Task>): Task {
    return { id: "t", title: "م", hasTime: false, priority: "normal", status: "pending", reminders: [], sync: SYNC, ...p };
  }
  function habit(p: Partial<Habit>): Habit {
    return { id: "h", title: "ع", recurrence: { frequency: "daily", interval: 1 }, reminders: [], sync: SYNC, ...p };
  }
  function comp(habitId: string, date: string): HabitCompletion {
    return { id: `${habitId}-${date}`, habitId, date, completedAt: "", sync: SYNC };
  }

  const base = {
    period: "day" as const,
    periodKey: "2026-06-10",
    tasks: [] as Task[],
    habits: [] as Habit[],
    habitCompletions: [] as HabitCompletion[],
    dhikrProgress: [],
    measurements: [],
    lifeAreas: [],
  };

  it("counts tasks due + done in the day (by dueAt)", () => {
    const m = computeReview({
      ...base,
      tasks: [
        task({ id: "a", dueAt: "2026-06-10T09:00:00.000Z", status: "completed", completedAt: "2026-06-10T10:00:00.000Z" }),
        task({ id: "b", dueAt: "2026-06-10T15:00:00.000Z" }),
        task({ id: "c", dueAt: "2026-06-11T09:00:00.000Z" }), // out of range
      ],
    });
    expect(m.tasksDue).toBe(2);
    expect(m.tasksDone).toBe(1);
  });

  it("habits: expected daily occurrence vs completion", () => {
    const h = habit({ id: "h1" });
    const m = computeReview({ ...base, habits: [h], habitCompletions: [comp("h1", "2026-06-10")] });
    expect(m.habitsDue).toBe(1);
    expect(m.habitsDone).toBe(1);
    expect(m.completionPct).toBe(100);
  });

  it("completion pct combines tasks + habits; delta vs previous", () => {
    const m = computeReview({
      ...base,
      tasks: [task({ id: "a", dueAt: "2026-06-10T09:00:00.000Z" })],
      habits: [habit({ id: "h1" })],
      habitCompletions: [comp("h1", "2026-06-10")],
      previousCompletionPct: 20,
    });
    // 1 done (habit) of 2 due → 50%
    expect(m.completionPct).toBe(50);
    expect(m.deltaPct).toBe(30);
  });

  it("weekly aggregates across 7 days", () => {
    const h = habit({ id: "h1" });
    const days = datesInPeriod("week", "2026-W24");
    const m = computeReview({
      ...base,
      period: "week",
      periodKey: "2026-W24",
      habits: [h],
      habitCompletions: days.slice(0, 3).map((d) => comp("h1", d)),
    });
    expect(m.habitsDue).toBe(7);
    expect(m.habitsDone).toBe(3);
  });

  it("empty period → all zeros, 0%", () => {
    const m = computeReview(base);
    expect(m.completionPct).toBe(0);
    expect(m.tasksDue).toBe(0);
    expect(m.habitsDue).toBe(0);
  });
});
