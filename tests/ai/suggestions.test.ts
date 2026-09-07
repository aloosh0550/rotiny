import { describe, expect, it } from "vitest";
import { computeSuggestions, type SuggestionInput } from "@/lib/ai/suggestions";
import type { Goal, Habit, HabitCompletion, Task } from "@/lib/types";

const SYNC = {
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  deletedAt: null,
  syncStatus: "synced" as const,
  remoteId: null,
  version: 1,
};

function task(p: Partial<Task>): Task {
  return {
    id: p.id ?? "t",
    title: p.title ?? "مهمة",
    hasTime: false,
    priority: "normal",
    status: "pending",
    reminders: [],
    sync: SYNC,
    ...p,
  };
}

function habit(p: Partial<Habit>): Habit {
  return {
    id: p.id ?? "h",
    title: p.title ?? "عادة",
    recurrence: { frequency: "daily", interval: 1 },
    reminders: [],
    sync: SYNC,
    ...p,
  };
}

const base: SuggestionInput = {
  today: "2026-09-07",
  now: new Date("2026-09-07T09:00:00.000Z"),
  locale: "ar",
  tasks: [],
  habits: [],
  habitCompletions: [],
  energyLoggedToday: true,
  hasPlanToday: true,
  goals: [],
};

describe("computeSuggestions", () => {
  it("empty day → no suggestions", () => {
    expect(computeSuggestions(base)).toEqual([]);
  });

  it("surfaces overdue tasks", () => {
    const out = computeSuggestions({
      ...base,
      tasks: [task({ id: "a", dueAt: "2026-09-01T00:00:00.000Z" })],
    });
    expect(out.find((s) => s.id === "overdue")).toBeTruthy();
    expect(out[0].actionRoute).toBe("/tasks");
  });

  it("nudges when energy is not logged", () => {
    const out = computeSuggestions({ ...base, energyLoggedToday: false });
    expect(out.map((s) => s.id)).toContain("energy");
  });

  it("offers to plan the day when there is something to plan and no plan yet", () => {
    const out = computeSuggestions({
      ...base,
      hasPlanToday: false,
      tasks: [task({ id: "x", plannedFor: "2026-09-07" })],
    });
    expect(out.map((s) => s.id)).toContain("plan");
  });

  it("protects a habit streak that is due today and unfinished", () => {
    const completions: HabitCompletion[] = [4, 3, 2, 1].map((d) => ({
      id: `c${d}`,
      habitId: "h",
      date: `2026-09-0${7 - d}`,
      completedAt: SYNC.createdAt,
      sync: SYNC,
    }));
    const out = computeSuggestions({
      ...base,
      habits: [habit({ id: "h", title: "قراءة" })],
      habitCompletions: completions,
    });
    const streak = out.find((s) => s.id.startsWith("streak:"));
    expect(streak).toBeTruthy();
    expect(streak!.text).toContain("قراءة");
  });

  it("nudges a goal whose deadline is within a week", () => {
    const goal: Goal = {
      id: "g1",
      title: "إنهاء التقرير",
      horizon: "week",
      status: "active",
      deadline: "2026-09-10",
      sync: SYNC,
    };
    const out = computeSuggestions({ ...base, goals: [goal] });
    expect(out.find((s) => s.id === "goal:g1")).toBeTruthy();
  });

  it("celebrates when everything for today is done", () => {
    const out = computeSuggestions({
      ...base,
      tasks: [task({ id: "d", status: "completed", completedAt: "2026-09-07T08:00:00.000Z" })],
    });
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("all-done");
    expect(out[0].tone).toBe("positive");
  });

  it("caps at 4 suggestions", () => {
    const out = computeSuggestions({
      ...base,
      energyLoggedToday: false,
      hasPlanToday: false,
      tasks: [
        task({ id: "o1", dueAt: "2026-09-01T00:00:00.000Z" }),
        task({ id: "o2", plannedFor: "2026-09-07" }),
      ],
      goals: [
        { id: "g", title: "هـ", horizon: "week", status: "active", deadline: "2026-09-09", sync: SYNC },
      ],
    });
    expect(out.length).toBeLessThanOrEqual(4);
  });
});
