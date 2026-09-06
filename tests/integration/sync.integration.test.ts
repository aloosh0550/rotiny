// @vitest-environment node
/**
 * SyncEngine end-to-end against a REAL local Supabase stack.
 *
 * Skipped unless RUN_SUPABASE_INTEGRATION=1 and a local stack is reachable
 * (`supabase start`). Not run in CI.
 *
 *   RUN_SUPABASE_INTEGRATION=1 \
 *   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=<local anon> \
 *   SUPABASE_SERVICE_ROLE_KEY=<local service> \
 *   npx vitest run tests/integration
 */
import "fake-indexeddb/auto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// minimal localStorage for the node env (SyncEngine stores cursors here)
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

const RUN = process.env.RUN_SUPABASE_INTEGRATION === "1";
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const d = RUN && URL && ANON && SERVICE ? describe : describe.skip;

d("SyncEngine ↔ Supabase", () => {
  let admin: SupabaseClient;
  let userA: { id: string };
  let userB: { id: string };
  let bClient: SupabaseClient;
  const email = (p: string) => `${p}_${Date.now()}@example.com`;
  const PW = "test-passw0rd!";

  // modules under test — imported after env + polyfills are in place
  let syncEngine: typeof import("@/lib/sync/SyncEngine").syncEngine;
  let getSyncConflicts: typeof import("@/lib/sync/SyncEngine").getSyncConflicts;
  let tasksRepository: typeof import("@/lib/db/repositories").tasksRepository;
  let getSupabase: typeof import("@/lib/supabase/client").getSupabase;

  beforeAll(async () => {
    admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

    const a = await admin.auth.admin.createUser({ email: email("a"), password: PW, email_confirm: true });
    const b = await admin.auth.admin.createUser({ email: email("b"), password: PW, email_confirm: true });
    userA = { id: a.data.user!.id };
    userB = { id: b.data.user!.id };

    ({ syncEngine, getSyncConflicts } = await import("@/lib/sync/SyncEngine"));
    ({ tasksRepository } = await import("@/lib/db/repositories"));
    ({ getSupabase } = await import("@/lib/supabase/client"));

    // sign the app's singleton client in as user A
    const sb = (await getSupabase())!;
    await sb.auth.signInWithPassword({ email: a.data.user!.email!, password: PW });

    // user B — a separate raw client
    bClient = createClient(URL, ANON, { auth: { persistSession: false } });
    await bClient.auth.signInWithPassword({ email: b.data.user!.email!, password: PW });

    await syncEngine.start(userA.id);
  }, 30_000);

  afterAll(async () => {
    await syncEngine.stop();
    if (userA) await admin.auth.admin.deleteUser(userA.id).catch(() => {});
    if (userB) await admin.auth.admin.deleteUser(userB.id).catch(() => {});
  });

  it("local create → reaches Supabase, and RLS hides it from user B", async () => {
    const id = crypto.randomUUID();
    await tasksRepository.create({
      id,
      title: "مهمة سحابية",
      hasTime: false,
      priority: "normal",
      status: "pending",
      reminders: [],
      sync: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), deletedAt: null, syncStatus: "pending", remoteId: null, version: 1 },
    });
    await syncEngine.flush();

    const onServer = await admin.from("tasks").select("title").eq("id", id).single();
    expect(onServer.data?.title).toBe("مهمة سحابية");

    const bSees = await bClient.from("tasks").select("id").eq("id", id);
    expect(bSees.data).toHaveLength(0);
  }, 20_000);

  it("a remote change by another device lands in the local replica via realtime", async () => {
    const id = crypto.randomUUID();
    // user A writes directly to the cloud from a "second device"
    const a2 = createClient(URL, ANON, { auth: { persistSession: false } });
    const aEmail = (await admin.auth.admin.getUserById(userA.id)).data.user!.email!;
    await a2.auth.signInWithPassword({ email: aEmail, password: PW });
    await a2.from("tasks").insert({
      id, user_id: userA.id, title: "من جهاز آخر", has_time: false,
      priority: "normal", status: "pending", reminders: [],
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(), version: 1,
    });

    // wait for realtime to reconcile the replica
    let local: unknown;
    for (let i = 0; i < 30; i++) {
      local = await tasksRepository.getById(id);
      if (local) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    expect((local as { title: string } | undefined)?.title).toBe("من جهاز آخر");
  }, 20_000);

  it("an offline edit based on a stale version is filed as a conflict (server wins)", async () => {
    const id = crypto.randomUUID();
    await tasksRepository.create({
      id, title: "أساس", hasTime: false, priority: "normal", status: "pending", reminders: [],
      sync: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), deletedAt: null, syncStatus: "pending", remoteId: null, version: 1 },
    });
    await syncEngine.flush(); // now on server at version 1

    // another device bumps it to version 2
    const aEmail = (await admin.auth.admin.getUserById(userA.id)).data.user!.email!;
    const a2 = createClient(URL, ANON, { auth: { persistSession: false } });
    await a2.auth.signInWithPassword({ email: aEmail, password: PW });
    await a2.from("tasks").update({ title: "غيّره جهاز آخر" }).eq("id", id);

    // our local (stale, base v1) edit
    await tasksRepository.update(id, { title: "تعديلي المحلي" });
    await syncEngine.flush();

    const conflicts = getSyncConflicts().filter((c) => c.id === id);
    expect(conflicts.length).toBeGreaterThan(0);
    // cloud wins in the replica
    const local = await tasksRepository.getById(id);
    expect((local as { title: string }).title).toBe("غيّره جهاز آخر");
  }, 20_000);

  it("first sign-in uploads pre-existing local rows to the cloud (id-preserving, non-destructive)", async () => {
    const { db } = await import("@/lib/db/schema");
    await syncEngine.stop();
    localStorage.removeItem("routini:sync:pulledOnce");

    const id = crypto.randomUUID();
    await db.table("tasks").put({
      id,
      title: "مهمة محلية قديمة",
      hasTime: false,
      priority: "later",
      status: "pending",
      reminders: [],
      sync: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), deletedAt: null, syncStatus: "pending", remoteId: null, version: 1 },
    });

    await syncEngine.start(userA.id);

    const onServer = await admin.from("tasks").select("title,user_id").eq("id", id).single();
    expect(onServer.data?.title).toBe("مهمة محلية قديمة");
    expect(onServer.data?.user_id).toBe(userA.id);
    // still present locally
    expect(await tasksRepository.getById(id)).toBeTruthy();
  }, 30_000);
});
