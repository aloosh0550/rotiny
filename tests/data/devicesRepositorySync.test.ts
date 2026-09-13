import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// devicesRepository's enqueue path is gated by `isSupabaseConfigured()`
// (helpers.ts), which reads env vars once at module load — mocking the env
// module directly (same technique as tests/ai/provider.test.ts) is the
// reliable way to exercise the "configured" branch regardless of what's in
// process.env for this test run.
vi.mock("@/lib/config/env", () => ({
  isSupabaseConfigured: () => true,
}));

const { db } = await import("@/lib/db/schema");
const { devicesRepository } = await import("@/lib/db/repositories");
const { PG_TABLE } = await import("@/lib/data/tables");

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

async function clearAll() {
  await Promise.all(db.tables.map((t) => t.clear()));
  localStorage.clear();
}
beforeEach(clearAll);
afterEach(clearAll);

describe("devicesRepository — cloud sync now enabled (entityType: \"devices\")", () => {
  it("registerThisDevice enqueues a create, once Supabase is configured", async () => {
    const device = await devicesRepository.registerThisDevice();
    const entries = await db.syncQueue.toArray();
    expect(entries).toHaveLength(1);
    expect(entries[0].entityType).toBe("devices");
    expect(entries[0].entityId).toBe(device.id);
    expect(entries[0].operation).toBe("create");
  });

  it("a subsequent registerThisDevice() (lastSeenAt bump) enqueues an update, not a second create — no duplicate row", async () => {
    await devicesRepository.registerThisDevice();
    await devicesRepository.registerThisDevice();
    expect(await db.devices.count()).toBe(1);
    const entries = await db.syncQueue.orderBy("createdAt").toArray();
    expect(entries.map((e) => e.operation)).toEqual(["create", "update"]);
    expect(new Set(entries.map((e) => e.entityId)).size).toBe(1);
  });

  it("the enqueued entityType resolves to the real Postgres table via PG_TABLE (so SyncEngine.flushEntry can push it)", async () => {
    await devicesRepository.registerThisDevice();
    const [entry] = await db.syncQueue.toArray();
    expect(PG_TABLE[entry.entityType]).toBe("devices");
  });
});
