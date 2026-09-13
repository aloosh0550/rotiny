import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db/schema";
import { devicesRepository } from "@/lib/db/repositories";
import { SYNCED_TABLES } from "@/lib/data/tables";

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

describe("devicesRepository", () => {
  it("registerThisDevice creates one row and reuses the same id across calls", async () => {
    const first = await devicesRepository.registerThisDevice();
    const second = await devicesRepository.registerThisDevice();
    expect(second.id).toBe(first.id);
    expect(await db.devices.count()).toBe(1);
  });

  it("bumps lastSeenAt on a subsequent call without duplicating the row", async () => {
    const first = await devicesRepository.registerThisDevice();
    await new Promise((r) => setTimeout(r, 5));
    const second = await devicesRepository.registerThisDevice();
    expect(new Date(second.lastSeenAt).getTime()).toBeGreaterThanOrEqual(
      new Date(first.lastSeenAt).getTime(),
    );
    expect(await db.devices.count()).toBe(1);
  });

  it("defaults to a web device with no push provider configured", async () => {
    const device = await devicesRepository.registerThisDevice();
    expect(device.platform).toBe("web");
    expect(device.kind).toBe("web");
    expect(device.pushProvider).toBe("none");
    expect(device.pushToken).toBeNull();
  });

  it("getThisDevice returns undefined before registration, the row after", async () => {
    expect(await devicesRepository.getThisDevice()).toBeUndefined();
    const registered = await devicesRepository.registerThisDevice();
    const fetched = await devicesRepository.getThisDevice();
    expect(fetched?.id).toBe(registered.id);
  });

  it("is local-only: creating/updating never enqueues to the sync outbox", async () => {
    await devicesRepository.registerThisDevice();
    await devicesRepository.registerThisDevice();
    expect(await db.syncQueue.count()).toBe(0);
  });

  it("is NOT yet a synced table — devices must stay out of SYNCED_TABLES until its Production migration is applied", () => {
    expect(SYNCED_TABLES as readonly string[]).not.toContain("devices");
  });
});
