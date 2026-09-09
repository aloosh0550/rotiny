// @vitest-environment node
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

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

import { db } from "@/lib/db/schema";
import { syncEngine } from "@/lib/sync/SyncEngine";
import { createSyncMeta } from "@/lib/utils/sync";

const SYNC = () => createSyncMeta();

async function seedEverything() {
  await db.tasks.add({
    id: "t1", title: "مهمة سرية", hasTime: false, priority: "normal", status: "pending",
    reminders: [], sync: SYNC(),
  });
  await db.aiConversations.add({ id: "c1", title: "محادثة", messages: [], sync: SYNC() });
  await db.aiMemory.add({
    id: "m1", kind: "preference", text: "تفضيل", source: null, enabled: true, confidence: null, sync: SYNC(),
  });
  await db.aiActions.add({
    id: "a1", kind: "deferTaskToTomorrow", payload: { taskId: "t1" }, reason: "سبب",
    status: "applied", autonomyAtTime: "automatic", source: "assistant", appliedAt: null, error: null, sync: SYNC(),
  });
  await db.settings.add({
    id: "singleton", locale: "ar", theme: "dark", onboardingCompleted: true, weekStartsOn: 0,
    // deliberately partial — repositories migrate the shape
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  localStorage.setItem("routini:sync:pulledOnce", "1");
  localStorage.setItem("routini:sync:account", "user-A");
  localStorage.setItem("routini:sync:cursor:tasks", "2026-01-01");
  localStorage.setItem("routini:reschedule:2026-09-09", "3");
  localStorage.setItem("routini:theme", "dark");
  localStorage.setItem("routini:locale", "ar");
}

beforeEach(seedEverything);
afterEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
  localStorage.clear();
});

describe("SyncEngine.wipeLocal — sign-out leaves nothing user-identifying", () => {
  it("clears every synced table AND the local-only aiActions table", async () => {
    await syncEngine.wipeLocal();
    expect(await db.tasks.count()).toBe(0);
    expect(await db.aiConversations.count()).toBe(0);
    expect(await db.aiMemory.count()).toBe(0);
    expect(await db.aiActions.count()).toBe(0); // <-- the Phase 15 fix
    expect(await db.settings.get("singleton")).toBeUndefined();
  });

  it("clears the sync + reschedule localStorage keys", async () => {
    await syncEngine.wipeLocal();
    expect(localStorage.getItem("routini:sync:pulledOnce")).toBeNull();
    expect(localStorage.getItem("routini:sync:account")).toBeNull();
    expect(localStorage.getItem("routini:sync:cursor:tasks")).toBeNull();
    expect(localStorage.getItem("routini:reschedule:2026-09-09")).toBeNull();
  });

  it("keeps device preferences (theme, locale) — they are not user-identifying", async () => {
    await syncEngine.wipeLocal();
    expect(localStorage.getItem("routini:theme")).toBe("dark");
    expect(localStorage.getItem("routini:locale")).toBe("ar");
  });
});
