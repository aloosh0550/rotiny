/**
 * SyncEngine — keeps the local Dexie replica in step with Supabase (the source
 * of truth) for the signed-in user.
 *
 *   start(userId) → initial pull → realtime subscribe → periodic + on-demand flush
 *
 * Cloud-first conflict rule: the server always wins. If a local offline edit is
 * based on a version the server has since moved past, the server row is applied
 * and the local attempt is filed in the conflict list (surfaced, never silently
 * dropped) for the user to re-apply.
 *
 * No-ops entirely when Supabase is unconfigured / there is no session.
 */

import { db } from "@/lib/db/schema";
import { syncQueueRepository } from "@/lib/db/repositories/syncQueueRepository";
import { settingsRepository } from "@/lib/db/repositories/settingsRepository";
import { cloudStore } from "@/lib/data/CloudStore";
import { DEXIE_TABLE, PG_TABLE, SYNCED_TABLES, type SyncedTable } from "@/lib/data/tables";
import { modelToRow, type Model } from "@/lib/data/rowMapping";
import type { SyncQueueEntry } from "@/lib/types";

const CURSOR_KEY = (t: string) => `routini:sync:cursor:${t}`;
const CONFLICTS_KEY = "routini:sync:conflicts";
const PULLED_ONCE_KEY = "routini:sync:pulledOnce";
const SV_KEY = (t: string, id: string) => `routini:sync:sv:${t}:${id}`;

/** The server `version` we last saw for a row — the base an offline edit builds on. */
function getServerVersion(t: string, id: string): number | null {
  try {
    const v = localStorage.getItem(SV_KEY(t, id));
    return v == null ? null : Number(v);
  } catch {
    return null;
  }
}
function setServerVersion(t: string, id: string, v: number) {
  try {
    localStorage.setItem(SV_KEY(t, id), String(v));
  } catch {
    /* ignore */
  }
}

export interface SyncConflict {
  table: SyncedTable;
  id: string;
  mine: Model;
  theirs: Model;
  at: string;
}

type Listener = (state: SyncState) => void;
export interface SyncState {
  /** null = cloud not active (signed out / unconfigured). */
  status: "idle" | "syncing" | "offline" | "error" | null;
  pending: number;
  lastSyncedAt: string | null;
  conflicts: number;
  /** the initial pull for this account has completed on this device */
  ready: boolean;
}

function readCursor(t: string): string | null {
  try {
    return localStorage.getItem(CURSOR_KEY(t));
  } catch {
    return null;
  }
}
function writeCursor(t: string, v: string | null) {
  try {
    if (v) localStorage.setItem(CURSOR_KEY(t), v);
  } catch {
    /* private mode */
  }
}
function readConflicts(): SyncConflict[] {
  try {
    return JSON.parse(localStorage.getItem(CONFLICTS_KEY) ?? "[]") as SyncConflict[];
  } catch {
    return [];
  }
}
function writeConflicts(list: SyncConflict[]) {
  try {
    localStorage.setItem(CONFLICTS_KEY, JSON.stringify(list.slice(-100)));
  } catch {
    /* ignore */
  }
}

class SyncEngineImpl {
  private userId: string | null = null;
  private unsub: (() => void) | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private listeners = new Set<Listener>();
  private state: SyncState = {
    status: null,
    pending: 0,
    lastSyncedAt: null,
    conflicts: 0,
    ready: false,
  };

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.state);
    return () => {
      this.listeners.delete(fn);
    };
  }
  getState(): SyncState {
    return this.state;
  }
  /** The signed-in user id, or null (signed out / cloud unconfigured). */
  currentUserId(): string | null {
    return this.userId;
  }
  private emit(patch: Partial<SyncState>) {
    this.state = { ...this.state, ...patch };
    for (const l of this.listeners) l(this.state);
  }

  hasPulledOnce(): boolean {
    try {
      return localStorage.getItem(PULLED_ONCE_KEY) === "1";
    } catch {
      return false;
    }
  }

  async start(userId: string): Promise<void> {
    if (this.running && this.userId === userId) return;
    await this.stop();
    if (!(await cloudStore.isReady())) return;
    this.userId = userId;
    this.running = true;

    // First sign-in on this device: push any pre-cloud local rows up before the
    // pull, so nothing is lost. Id-preserving + only-if-absent → idempotent.
    if (!this.hasPulledOnce()) {
      await this.uploadLocalOnce(userId).catch(() => {});
    }

    await this.pullAll();
    await this.pullSettings().catch(() => {});
    // seed default Life Areas the cloud doesn't have yet (idempotent by key),
    // then push them — after the pull so a 2nd device never key-duplicates.
    try {
      const { lifeAreasRepository } = await import("@/lib/db/repositories");
      await lifeAreasRepository.ensureDefaults();
    } catch {
      /* ignore */
    }
    try {
      localStorage.setItem(PULLED_ONCE_KEY, "1");
    } catch {
      /* ignore */
    }
    this.emit({ ready: true, conflicts: readConflicts().length });

    const unsubRows = await cloudStore.subscribe(userId, (table, model, event) => {
      void this.applyRemote(table, model, event);
    });
    const unsubSettings = await cloudStore.subscribeSettings(userId, (s) => {
      void settingsRepository.applyRemote(s as never).catch(() => {});
    });
    this.unsub = () => {
      unsubRows();
      unsubSettings();
    };

    await this.flush();

    this.timer = setInterval(() => void this.flush(), 20_000);
    if (typeof window !== "undefined") {
      window.addEventListener("online", this.onOnline);
    }
  }

  async stop(): Promise<void> {
    this.running = false;
    this.userId = null;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.unsub) this.unsub();
    this.unsub = null;
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.onOnline);
    }
    this.emit({ status: null, ready: false, pending: 0 });
  }

  private onOnline = () => void this.flush();

  /**
   * Wipe the local replica + outbox + per-row sync bookkeeping (on sign-out), so
   * the next account on this device starts from a clean cache. Keeps the Dexie
   * `settings` row but resets the synced parts to defaults.
   */
  async wipeLocal(): Promise<void> {
    await this.stop();
    await Promise.all(SYNCED_TABLES.map((t) => db.table(DEXIE_TABLE[t]).clear()));
    await syncQueueRepository.clear();
    await db.settings.delete("singleton").catch(() => {});
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith("routini:sync:")) localStorage.removeItem(k);
      }
    } catch {
      /* ignore */
    }
  }

  private async pullSettings(): Promise<void> {
    if (!this.userId) return;
    const cloud = await cloudStore.pullSettings(this.userId);
    if (cloud) {
      // cloud wins; migrateSettingsShape backfills any locally-known keys
      await settingsRepository.applyRemote(cloud as never).catch(() => {});
    }
  }

  private async pushSettings(): Promise<void> {
    if (!this.userId) return;
    const local = await settingsRepository.get();
    if (local) {
      await cloudStore.pushSettings(this.userId, local as unknown as Record<string, unknown>);
    }
  }

  /**
   * One-time: upload local rows that the cloud doesn't have yet (an existing
   * local-only user signing in for the first time). Never deletes anything.
   */
  private async uploadLocalOnce(userId: string): Promise<void> {
    // settings: only push if the cloud profile has none yet
    const cloudSettings = await cloudStore.pullSettings(userId).catch(() => null);
    if (!cloudSettings) {
      const local = await settingsRepository.get().catch(() => undefined);
      if (local) {
        await cloudStore
          .pushSettings(userId, local as unknown as Record<string, unknown>)
          .catch(() => {});
      }
    }
    for (const table of SYNCED_TABLES) {
      const dx = db.table(DEXIE_TABLE[table]);
      const rows = (await dx.toArray()) as Model[];
      for (const local of rows) {
        if (local.sync.deletedAt) continue;
        const existing = await cloudStore.getOne(table, local.id).catch(() => null);
        if (existing) {
          setServerVersion(table, local.id, existing.sync.version);
          continue;
        }
        const canonical = await cloudStore.push(table, local, userId).catch(() => null);
        if (canonical) {
          await dx.put(canonical);
          setServerVersion(table, canonical.id, canonical.sync.version);
        }
      }
    }
  }

  private async pullAll(): Promise<void> {
    this.emit({ status: "syncing" });
    try {
      for (const table of SYNCED_TABLES) {
        const since = readCursor(table);
        const { rows, cursor } = await cloudStore.pull(table, since);
        const dx = db.table(DEXIE_TABLE[table]);
        for (const model of rows) {
          if (model.sync.deletedAt) {
            await dx.delete(model.id);
          } else {
            await dx.put(model);
          }
          setServerVersion(table, model.id, model.sync.version);
        }
        writeCursor(table, cursor);
      }
      this.emit({ status: "idle", lastSyncedAt: new Date().toISOString() });
    } catch {
      this.emit({ status: navigator.onLine === false ? "offline" : "error" });
    }
  }

  private async applyRemote(
    table: SyncedTable,
    model: Model | { id: string },
    event: string,
  ): Promise<void> {
    const dx = db.table(DEXIE_TABLE[table]);
    if (event === "DELETE" || !("sync" in model)) {
      await dx.delete(model.id);
      return;
    }
    if (model.sync.deletedAt) await dx.delete(model.id);
    else await dx.put(model);
    setServerVersion(table, model.id, model.sync.version);
    writeCursor(table, model.sync.updatedAt);
    this.emit({ lastSyncedAt: new Date().toISOString() });
  }

  /** Public: called after any local mutation and on interval / reconnect. */
  async flush(): Promise<void> {
    if (!this.running || !this.userId) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      this.emit({ status: "offline", pending: await syncQueueRepository.count() });
      return;
    }
    const entries = await syncQueueRepository.getAll();
    this.emit({ status: entries.length ? "syncing" : "idle", pending: entries.length });

    for (const entry of entries) {
      try {
        await this.flushEntry(entry);
        await syncQueueRepository.remove(entry.id);
      } catch {
        // keep it queued; try again next tick
        break;
      }
    }

    const remaining = await syncQueueRepository.count();
    this.emit({
      status: remaining ? "error" : "idle",
      pending: remaining,
      lastSyncedAt: new Date().toISOString(),
      conflicts: readConflicts().length,
    });
  }

  private async flushEntry(entry: SyncQueueEntry): Promise<void> {
    if (entry.entityType === "settings") {
      await this.pushSettings();
      return;
    }
    const pgTable = PG_TABLE[entry.entityType] as SyncedTable | undefined;
    if (!pgTable) return; // unknown — not synced this way
    const userId = this.userId!;
    const dx = db.table(DEXIE_TABLE[pgTable]);

    if (entry.operation === "delete") {
      await cloudStore.remove(pgTable, entry.entityId);
      return;
    }

    const local = (await dx.get(entry.entityId)) as Model | undefined;
    if (!local) return; // deleted locally before flush — nothing to push

    // Conflict check: has the server moved past the version our local state was
    // last reconciled to? If so and the row actually differs → cloud wins, the
    // local attempt is filed for the user to re-apply.
    const known = getServerVersion(pgTable, entry.entityId);
    const server = await cloudStore.getOne(pgTable, entry.entityId).catch(() => null);
    if (server && !server.sync.deletedAt && known != null && server.sync.version !== known) {
      const differs =
        JSON.stringify(stripMeta(modelToRow(server, userId))) !==
        JSON.stringify(stripMeta(modelToRow(local, userId)));
      if (differs) {
        const list = readConflicts();
        list.push({
          table: pgTable,
          id: entry.entityId,
          mine: local,
          theirs: server,
          at: new Date().toISOString(),
        });
        writeConflicts(list);
        await dx.put(server); // cloud wins
        setServerVersion(pgTable, entry.entityId, server.sync.version);
        return;
      }
    }

    const canonical = await cloudStore.push(pgTable, local, userId);
    if (canonical) {
      await dx.put(canonical);
      setServerVersion(pgTable, canonical.id, canonical.sync.version);
    }
  }
}

function stripMeta(row: Record<string, unknown>): Record<string, unknown> {
  const { created_at, updated_at, deleted_at, version, user_id, ...rest } = row;
  void created_at;
  void updated_at;
  void deleted_at;
  void version;
  void user_id;
  return rest;
}

export const syncEngine = new SyncEngineImpl();

export function getSyncConflicts(): SyncConflict[] {
  return readConflicts();
}
export function dismissConflict(id: string): void {
  writeConflicts(readConflicts().filter((c) => c.id !== id));
}

/**
 * Re-apply the local ("mine") side of a conflict on top of the current server
 * row: the user chose their version. Bumps off the latest server version so it
 * is no longer stale, writes it locally, queues the push, and flushes.
 */
export async function reapplyConflict(c: SyncConflict): Promise<void> {
  const dexieName = DEXIE_TABLE[c.table];
  const dx = db.table(dexieName);
  const current = (await dx.get(c.id)) as Model | undefined;
  const merged: Model = {
    ...(current ?? c.mine),
    ...stripRowKeys(c.mine),
    id: c.id,
    sync: {
      ...(current?.sync ?? c.mine.sync),
      updatedAt: new Date().toISOString(),
      syncStatus: "pending",
      version: (current?.sync.version ?? c.mine.sync.version) + 1,
    },
  } as Model;
  await dx.put(merged);
  await db.syncQueue.add({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    entityType: dexieName as never,
    entityId: c.id,
    operation: "update",
    payload: null,
    createdAt: new Date().toISOString(),
    attempts: 0,
  });
  dismissConflict(c.id);
  await syncEngine.flush();
}

/** domain fields of a model (drop id + sync). */
function stripRowKeys(m: Model): Record<string, unknown> {
  const { id, sync, ...rest } = m;
  void id;
  void sync;
  return rest;
}
