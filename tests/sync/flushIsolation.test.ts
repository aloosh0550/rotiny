import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// minimal localStorage for the node env
if (typeof globalThis.localStorage === "undefined") {
  const m = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, String(v)),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
    key: (i: number) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
  } as Storage;
}
Object.defineProperty(globalThis, "navigator", {
  value: { onLine: true },
  writable: true,
  configurable: true,
});

vi.mock("@/lib/config/env", () => ({ isSupabaseConfigured: () => true }));

vi.mock("@/lib/data/CloudStore", () => ({
  cloudStore: {
    isReady: vi.fn().mockResolvedValue(true),
    pull: vi.fn().mockImplementation(async (table: string) => ({ table, rows: [], cursor: null })),
    getOne: vi.fn().mockResolvedValue(null),
    // `devices` always fails to push (simulates its migration not yet being
    // applied on Production — CloudStore.push intentionally throws rather
    // than silently dropping the mutation); every other table succeeds.
    push: vi.fn().mockImplementation(async (table: string, model: { id: string; sync: unknown }) => {
      if (table === "devices") throw new Error("relation \"public.devices\" does not exist");
      return { ...model, sync: { ...(model.sync as object), syncStatus: "synced" } };
    }),
    remove: vi.fn().mockResolvedValue(undefined),
    pullSettings: vi.fn().mockResolvedValue(null),
    pushSettings: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn().mockResolvedValue(() => {}),
    subscribeSettings: vi.fn().mockResolvedValue(() => {}),
  },
}));

const { db } = await import("@/lib/db/schema");
const { syncEngine } = await import("@/lib/sync/SyncEngine");
const { tasksRepository } = await import("@/lib/db/repositories");

async function clearAll() {
  await Promise.all(db.tables.map((t) => t.clear()));
  localStorage.clear();
}
beforeEach(clearAll);
afterEach(async () => {
  await syncEngine.stop();
  await clearAll();
  vi.clearAllMocks();
});

describe("SyncEngine.flush — a persistently-failing entity must not block any other entity's sync", () => {
  it("devices failing to push (pre-migration) never prevents a later-queued task from flushing", async () => {
    // start() itself calls registerThisDevice() (creating + enqueuing a
    // "devices" create) and then flush() once at the end — that first
    // attempt already fails against the mocked CloudStore and stays queued.
    await syncEngine.start("user-1");

    const afterStart = await db.syncQueue.orderBy("createdAt").toArray();
    expect(afterStart).toHaveLength(1);
    expect(afterStart[0].entityType).toBe("devices");

    // now a task is created — its queue entry is strictly AFTER the stuck
    // devices entry, so this is a real test of "earlier failure blocks later
    // entries" — not just registration order coincidence.
    const taskId = crypto.randomUUID();
    await tasksRepository.create({
      id: taskId,
      title: "مهمة بعد فشل devices",
      hasTime: false,
      priority: "normal",
      status: "pending",
      reminders: [],
      sync: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), deletedAt: null, syncStatus: "pending", remoteId: null, version: 1 },
    });

    await syncEngine.flush();

    const remaining = await db.syncQueue.orderBy("createdAt").toArray();
    // the devices entry is still stuck (kept failing) — the task entry, which
    // came later in the queue, was still processed and removed.
    expect(remaining.map((e) => e.entityType)).toEqual(["devices"]);
  });
});
