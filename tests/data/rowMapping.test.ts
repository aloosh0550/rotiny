import { describe, expect, it } from "vitest";
import { camelToSnake, snakeToCamel, modelToRow, rowToModel } from "@/lib/data/rowMapping";
import type { Task } from "@/lib/types";

describe("key case conversion", () => {
  it("camelToSnake / snakeToCamel round-trip", () => {
    for (const k of ["dueAt", "hasTime", "categoryId", "linkedAppointmentId", "targetCount", "id", "color"]) {
      expect(snakeToCamel(camelToSnake(k))).toBe(k);
    }
    expect(camelToSnake("dueAt")).toBe("due_at");
    expect(camelToSnake("targetCount")).toBe("target_count");
  });
});

describe("modelToRow / rowToModel", () => {
  const task: Task = {
    id: "11111111-1111-1111-1111-111111111111",
    title: "تقرير",
    dueAt: "2026-06-10T09:00:00.000Z",
    hasTime: true,
    priority: "important",
    status: "pending",
    categoryId: null,
    pinned: true,
    recurrence: { frequency: "weekly", interval: 1, byWeekday: [1, 3] },
    reminders: [{ id: "r1", offsetMinutes: 30, method: "push" }],
    sync: {
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-02T00:00:00.000Z",
      deletedAt: null,
      syncStatus: "pending",
      remoteId: null,
      version: 3,
    },
  };

  it("model -> row flattens sync and snake-cases top-level keys", () => {
    const row = modelToRow(task as unknown as Parameters<typeof modelToRow>[0], "user-abc");
    expect(row.user_id).toBe("user-abc");
    expect(row.due_at).toBe(task.dueAt);
    expect(row.has_time).toBe(true);
    expect(row.category_id).toBeNull();
    expect(row.created_at).toBe("2026-06-01T00:00:00.000Z");
    expect(row.updated_at).toBe("2026-06-02T00:00:00.000Z");
    expect(row.deleted_at).toBeNull();
    expect(row.version).toBe(3);
    expect(row.sync).toBeUndefined();
    // jsonb values keep their inner camelCase keys
    expect((row.reminders as Array<{ offsetMinutes: number }>)[0].offsetMinutes).toBe(30);
    expect((row.recurrence as { byWeekday: number[] }).byWeekday).toEqual([1, 3]);
  });

  it("row -> model rebuilds sync and camel-cases keys", () => {
    const row = modelToRow(task as unknown as Parameters<typeof modelToRow>[0], "user-abc");
    const back = rowToModel(row);
    expect(back.id).toBe(task.id);
    expect((back as unknown as Task).dueAt).toBe(task.dueAt);
    expect((back as unknown as Task).hasTime).toBe(true);
    expect((back as unknown as Task).categoryId).toBeNull();
    expect(back.sync.createdAt).toBe(task.sync.createdAt);
    expect(back.sync.updatedAt).toBe(task.sync.updatedAt);
    expect(back.sync.version).toBe(3);
    expect(back.sync.syncStatus).toBe("synced");
    expect(back.sync.remoteId).toBe(task.id);
    expect((back as unknown as Task).reminders[0].offsetMinutes).toBe(30);
  });

  it("full round-trip preserves the model's domain fields", () => {
    const row = modelToRow(task as unknown as Parameters<typeof modelToRow>[0], "u");
    const back = rowToModel(row) as unknown as Task;
    expect(back.title).toBe(task.title);
    expect(back.priority).toBe(task.priority);
    expect(back.pinned).toBe(true);
    expect(back.recurrence).toEqual(task.recurrence);
  });
});
