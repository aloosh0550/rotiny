import { describe, expect, it } from "vitest";
import { buildLocalPlan, type PlannerInput } from "@/lib/planner/localPlanner";
import type { Appointment, Habit, Task } from "@/lib/types";

const SYNC = { createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "", syncStatus: "pending" as const, version: 1 };

function task(p: Partial<Task>): Task {
  return {
    id: p.id ?? "t",
    title: p.title ?? "مهمة",
    hasTime: p.hasTime ?? false,
    priority: p.priority ?? "normal",
    status: p.status ?? "pending",
    reminders: [],
    sync: SYNC,
    ...p,
  };
}

function appt(p: Partial<Appointment>): Appointment {
  return {
    id: p.id ?? "a",
    title: p.title ?? "موعد",
    startAt: p.startAt ?? "",
    endAt: p.endAt ?? "",
    allDay: false,
    reminders: [],
    calendarProviderId: "local",
    sync: SYNC,
    ...p,
  };
}

function habit(p: Partial<Habit>): Habit {
  return {
    id: p.id ?? "h",
    title: p.title ?? "عادة",
    recurrence: p.recurrence ?? { frequency: "daily", interval: 1 },
    reminders: [],
    sync: SYNC,
    ...p,
  };
}

const base = (now: Date): Omit<PlannerInput, "tasks" | "appointments" | "habits"> => ({
  now,
  habitCompletions: [],
});

describe("buildLocalPlan", () => {
  const now = new Date(2026, 5, 10, 9, 0, 0); // 09:00

  it("an imminent appointment is 'now', even over an important task", () => {
    const plan = buildLocalPlan({
      ...base(now),
      tasks: [task({ id: "t1", priority: "important", title: "تقرير" })],
      appointments: [
        appt({ id: "a1", title: "اجتماع", startAt: new Date(2026, 5, 10, 9, 30).toISOString(), endAt: new Date(2026, 5, 10, 10, 30).toISOString() }),
      ],
      habits: [],
    });
    expect(plan.now?.type).toBe("appointment");
    expect(plan.now?.id).toBe("a1");
    expect(plan.now?.reason).toContain("دقيقة");
  });

  it("with no appointments, the overdue task outranks a normal one", () => {
    const plan = buildLocalPlan({
      ...base(now),
      tasks: [
        task({ id: "t1", title: "عادية" }),
        task({ id: "t2", title: "متأخرة", dueAt: new Date(2026, 5, 9, 12, 0).toISOString(), hasTime: true }),
      ],
      appointments: [],
      habits: [],
    });
    expect(plan.now?.id).toBe("t2");
    expect(plan.now?.reason).toContain("تجاوز");
    expect(plan.next?.id).toBe("t1");
  });

  it("pinned beats an unpinned important task", () => {
    const plan = buildLocalPlan({
      ...base(now),
      tasks: [
        task({ id: "imp", priority: "important" }),
        task({ id: "pin", priority: "normal", pinned: true }),
      ],
      appointments: [],
      habits: [],
    });
    expect(plan.now?.id).toBe("pin");
  });

  it("low energy demotes a high-energy-cost task below a low-cost one of equal length", () => {
    const heavy = task({ id: "heavy", durationMinutes: 20, energyCost: "high" });
    const light = task({ id: "light", durationMinutes: 20, energyCost: "low" });
    const low = buildLocalPlan({ ...base(now), energy: "low", tasks: [heavy, light], appointments: [], habits: [] });
    expect(low.now?.id).toBe("light");
    const good = buildLocalPlan({ ...base(now), energy: "good", tasks: [heavy, light], appointments: [], habits: [] });
    expect(good.now?.id).toBe("heavy"); // no adjustment at neutral energy → first wins
  });

  it("low energy demotes a long task below a short one", () => {
    const long = task({ id: "long", durationMinutes: 90 });
    const short = task({ id: "short", durationMinutes: 10 });
    const high = buildLocalPlan({ ...base(now), energy: "good", tasks: [long, short], appointments: [], habits: [] });
    const low = buildLocalPlan({ ...base(now), energy: "low", tasks: [long, short], appointments: [], habits: [] });
    expect(high.now?.id).toBe("long"); // equal base, first wins on stable sort
    expect(low.now?.id).toBe("short");
  });

  it("a daily habit due today appears; a completed one does not", () => {
    const h = habit({ id: "h1", title: "ماء" });
    const withPending = buildLocalPlan({ ...base(now), tasks: [], appointments: [], habits: [h] });
    expect(withPending.remaining.some((i) => i.id === "h1")).toBe(true);

    const withDone = buildLocalPlan({
      ...base(now),
      tasks: [],
      appointments: [],
      habits: [h],
      habitCompletions: [
        { id: "c", habitId: "h1", date: "2026-06-10", completedAt: "", sync: SYNC },
      ],
    });
    expect(withDone.remaining.some((i) => i.id === "h1")).toBe(false);
  });

  it("flags overload when the untimed work cannot fit before day end", () => {
    const many = Array.from({ length: 20 }, (_, i) => task({ id: `t${i}`, durationMinutes: 60 }));
    const plan = buildLocalPlan({ ...base(new Date(2026, 5, 10, 20, 0)), tasks: many, appointments: [], habits: [], dayEndHour: 22 });
    expect(plan.overload.over).toBe(true);
    expect(plan.overload.availableMinutes).toBeLessThan(plan.overload.plannedMinutes);
  });

  it("returns a clear day when nothing is pending", () => {
    const plan = buildLocalPlan({ ...base(now), tasks: [], appointments: [], habits: [] });
    expect(plan.now).toBeNull();
    expect(plan.next).toBeNull();
    expect(plan.remaining).toHaveLength(0);
  });

  it("timed items are ordered chronologically in remaining", () => {
    const plan = buildLocalPlan({
      ...base(now),
      tasks: [
        task({ id: "late", hasTime: true, dueAt: new Date(2026, 5, 10, 16, 0).toISOString() }),
        task({ id: "early", hasTime: true, dueAt: new Date(2026, 5, 10, 11, 0).toISOString() }),
      ],
      appointments: [],
      habits: [],
    });
    const ids = plan.remaining.map((i) => i.id);
    expect(ids.indexOf("early")).toBeLessThan(ids.indexOf("late"));
  });

  it("a task planned for a later day is excluded from today's plan", () => {
    const plan = buildLocalPlan({
      ...base(now), // now = 2026-06-10 …
      tasks: [
        task({ id: "today", plannedFor: "2026-06-10" }),
        task({ id: "tomorrow", plannedFor: "2026-06-11" }),
        task({ id: "yesterday", plannedFor: "2026-06-09" }), // stays — it's still pending
      ],
      appointments: [],
      habits: [],
    });
    const ids = plan.remaining.map((i) => i.id);
    expect(ids).toContain("today");
    expect(ids).toContain("yesterday");
    expect(ids).not.toContain("tomorrow");
  });
});
