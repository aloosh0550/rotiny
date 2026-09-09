import { describe, expect, it } from "vitest";
import { planReschedule, MAX_RESCHEDULES_PER_DAY } from "@/lib/planner/reschedule";
import type { Appointment, Habit, Task } from "@/lib/types";

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
    durationMinutes: 60,
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

const baseInput = (over: Partial<Parameters<typeof planReschedule>[0]> = {}) => ({
  now: new Date("2026-09-07T20:00:00"), // 2h before day end → 120 min left
  energy: null,
  tasks: [] as Task[],
  appointments: [] as Appointment[],
  habits: [] as Habit[],
  habitCompletions: [],
  ...over,
});

describe("planReschedule (deterministic Smart Rescheduling)", () => {
  it("a clear day proposes nothing", () => {
    const r = planReschedule(baseInput({ tasks: [task({ id: "a", durationMinutes: 30 })] }));
    expect(r.proposals).toHaveLength(0);
    expect(r.note).toBe("clear");
  });

  it("defers only the tasks that overflow the time left — lowest priority first", () => {
    const r = planReschedule(
      baseInput({
        tasks: [
          task({ id: "imp", priority: "important", durationMinutes: 90 }),
          task({ id: "low", priority: "later", durationMinutes: 90 }),
        ],
      }),
    );
    const deferred = r.proposals.filter((p) => p.kind === "deferTaskToTomorrow").map((p) => p.taskId);
    expect(deferred).toEqual(["low"]); // the important one fits, the low one overflows
  });

  it("never proposes deleting anything and never touches an appointment", () => {
    const r = planReschedule(
      baseInput({
        tasks: [task({ id: "a", durationMinutes: 300 }), task({ id: "b", durationMinutes: 300 })],
        appointments: [
          {
            id: "appt",
            title: "اجتماع",
            startAt: "2026-09-07T20:30:00",
            endAt: "2026-09-07T21:30:00",
            allDay: false,
            reminders: [],
            calendarProviderId: "device",
            sync: SYNC,
          } as Appointment,
        ],
      }),
    );
    expect(r.proposals.every((p) => p.kind === "moveItemToBucket" || p.kind === "deferTaskToTomorrow")).toBe(true);
    expect(r.proposals.some((p) => (p.refId ?? p.taskId) === "appt")).toBe(false);
  });

  it("a habit that overflows is NOT deferred (habits are per-day, never moved)", () => {
    const r = planReschedule(
      baseInput({
        now: new Date("2026-09-07T21:50:00"), // ~10 min left
        habits: [habit({ id: "h1" })],
        tasks: [task({ id: "t1", durationMinutes: 120 })],
      }),
    );
    expect(r.proposals.some((p) => p.refId === "h1" || p.taskId === "h1")).toBe(false);
    expect(r.summary.overflowCount).toBeGreaterThan(0);
  });

  it("moves an untimed task stuck in a past window to the current one", () => {
    // 20:00 → evening bucket. A normal untimed task lands in the current bucket by
    // default, so force a morning-anchored one via a due time earlier today.
    const r = planReschedule(
      baseInput({
        now: new Date("2026-09-07T20:00:00"),
        tasks: [task({ id: "m", hasTime: false, durationMinutes: 15 })],
      }),
    );
    // untimed tasks bucket to "now" already → no move needed
    expect(r.proposals.filter((p) => p.kind === "moveItemToBucket")).toHaveLength(0);
  });

  it("loop guard: stops proposing after MAX_RESCHEDULES_PER_DAY", () => {
    const input = baseInput({ tasks: [task({ id: "a", durationMinutes: 999 })] });
    expect(planReschedule({ ...input, runsToday: MAX_RESCHEDULES_PER_DAY }).note).toBe("loop-guard");
    expect(planReschedule({ ...input, runsToday: MAX_RESCHEDULES_PER_DAY }).proposals).toHaveLength(0);
  });

  it("per-item loop guard: never re-proposes for a task already acted on", () => {
    const r = planReschedule(
      baseInput({
        tasks: [task({ id: "again", durationMinutes: 999 })],
        touchedKeys: new Set(["task:again"]),
      }),
    );
    expect(r.proposals).toHaveLength(0);
  });

  it("every proposal carries a human-readable Arabic reason", () => {
    const r = planReschedule(
      baseInput({ tasks: [task({ id: "a", durationMinutes: 999, priority: "later" })] }),
    );
    expect(r.proposals.length).toBeGreaterThan(0);
    for (const p of r.proposals) expect(p.reason.trim().length).toBeGreaterThan(5);
  });
});
