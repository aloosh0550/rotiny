import { describe, expect, it, vi } from "vitest";

// A fake Supabase client whose every query resolves with a configurable error,
// so we can test CloudStore's "table not on the server yet" degradation without
// a real project. `getSupabase()` also needs a session for `client()` to proceed.
function fakeSupabase(error: { code?: string; message?: string } | null) {
  const result = { data: error ? null : [], error };
  const single = { data: error ? null : { id: "x" }, error };

  const builder = {
    select: () => builder,
    order: () => builder,
    limit: () => Promise.resolve(result),
    eq: () => builder,
    maybeSingle: () => Promise.resolve({ data: error ? null : { id: "x" }, error }),
    upsert: () => builder,
    single: () => Promise.resolve(single),
    update: () => builder,
    // `pull` awaits the builder itself (no terminal call after .limit() in some
    // paths) — make the builder thenable so `await q` also resolves.
    then: (resolve: (v: unknown) => void) => resolve(result),
  };

  return {
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: "u1" } } } }) },
    from: () => builder,
  };
}

/**
 * A fake client for `subscribe()`: `.from(table).select().limit()` errors for
 * any table in `missingTables` (simulating one not yet migrated on the
 * server), and a fake `.channel()` records every `.on("postgres_changes", …)`
 * binding so a test can assert which tables actually got bound.
 */
function fakeSupabaseForSubscribe(missingTables: Set<string>) {
  const builderFor = (table: string) => ({
    select: () => builderFor(table),
    limit: () =>
      Promise.resolve(
        missingTables.has(table)
          ? { data: null, error: MISSING }
          : { data: [{ id: "x" }], error: null },
      ),
  });
  const bindings: { table: string }[] = [];
  const channel = {
    on: (_type: string, opts: { table: string }) => {
      bindings.push({ table: opts.table });
      return channel;
    },
    subscribe: (cb: () => void) => {
      cb();
      return channel;
    },
  };
  return {
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: "u1" } } } }) },
    from: (table: string) => builderFor(table),
    channel: () => channel,
    removeChannel: () => Promise.resolve("ok" as const),
    _bindings: bindings,
  };
}

vi.mock("@/lib/supabase/client", () => ({
  getSupabase: vi.fn(),
}));

const { getSupabase } = await import("@/lib/supabase/client");
const { cloudStore } = await import("@/lib/data/CloudStore");
const { SYNCED_TABLES } = await import("@/lib/data/tables");

const MISSING = { code: "PGRST205", message: 'Could not find the table "public.ai_actions" in the schema cache' };
const OTHER = { code: "23505", message: "duplicate key value violates unique constraint" };

const model = {
  id: "row-1",
  kind: "deferTaskToTomorrow",
  sync: { createdAt: "", updatedAt: "", deletedAt: null, syncStatus: "pending" as const, remoteId: null, version: 1 },
};

describe("CloudStore — missing-table degradation (a table added to SYNCED_TABLES before its migration applies)", () => {
  it("pull() returns empty rows instead of throwing", async () => {
    vi.mocked(getSupabase).mockResolvedValue(fakeSupabase(MISSING) as never);
    const res = await cloudStore.pull("ai_actions" as never, null);
    expect(res).toEqual({ table: "ai_actions", rows: [], cursor: null });
  });

  it("getOne() returns null instead of throwing", async () => {
    vi.mocked(getSupabase).mockResolvedValue(fakeSupabase(MISSING) as never);
    await expect(cloudStore.getOne("ai_actions" as never, "id1")).resolves.toBeNull();
  });

  it("push() still THROWS (so the outbox entry stays queued and retries later, never silently dropped)", async () => {
    vi.mocked(getSupabase).mockResolvedValue(fakeSupabase(MISSING) as never);
    await expect(cloudStore.push("ai_actions" as never, model as never, "u1")).rejects.toThrow();
  });

  it("remove() still THROWS for the same reason", async () => {
    vi.mocked(getSupabase).mockResolvedValue(fakeSupabase(MISSING) as never);
    await expect(cloudStore.remove("ai_actions" as never, "id1")).rejects.toThrow();
  });

  it("a genuinely different error is NOT swallowed by pull/getOne", async () => {
    vi.mocked(getSupabase).mockResolvedValue(fakeSupabase(OTHER) as never);
    await expect(cloudStore.pull("tasks" as never, null)).rejects.toThrow(/duplicate key/);
    await expect(cloudStore.getOne("tasks" as never, "id1")).rejects.toThrow(/duplicate key/);
  });

  it("no error at all → pull/getOne behave normally", async () => {
    vi.mocked(getSupabase).mockResolvedValue(fakeSupabase(null) as never);
    const res = await cloudStore.pull("tasks" as never, null);
    expect(res.rows).toEqual([]);
    await expect(cloudStore.getOne("tasks" as never, "id1")).resolves.not.toBeNull();
  });
});

describe("CloudStore.subscribe — a missing table must not break realtime for every other table", () => {
  it("skips the postgres_changes binding for a table that isn't on the server yet, but still binds every other SYNCED_TABLES entry", async () => {
    const fake = fakeSupabaseForSubscribe(new Set(["devices"]));
    vi.mocked(getSupabase).mockResolvedValue(fake as never);

    const unsubscribe = await cloudStore.subscribe("u1", () => {});

    const boundTables = new Set(fake._bindings.map((b) => b.table));
    expect(boundTables.has("devices")).toBe(false);
    for (const table of SYNCED_TABLES) {
      if (table === "devices") continue;
      expect(boundTables.has(table)).toBe(true);
    }
    unsubscribe();
  });

  it("binds every table when none are missing (control case)", async () => {
    const fake = fakeSupabaseForSubscribe(new Set());
    vi.mocked(getSupabase).mockResolvedValue(fake as never);

    await cloudStore.subscribe("u1", () => {});

    const boundTables = new Set(fake._bindings.map((b) => b.table));
    for (const table of SYNCED_TABLES) {
      expect(boundTables.has(table)).toBe(true);
    }
  });
});
