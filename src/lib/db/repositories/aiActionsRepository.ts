import { db } from "@/lib/db/schema";
import type { AiActionLog, AiActionSource, AiActionStatus } from "@/lib/types";
import { createSyncMeta, touchSyncMeta } from "@/lib/utils/sync";
import { generateId } from "@/lib/utils/id";
import { makeSyncedRepository } from "./helpers";

// No entityType yet → local-first (nothing enqueued). Wire the "aiActions" tag +
// SYNCED_TABLES entry once 20260914000000_phase11_ai_actions.sql is applied.
const base = makeSyncedRepository<AiActionLog>(db.aiActions);

export const aiActionsRepository = {
  ...base,

  async log(entry: {
    kind: string;
    payload: Record<string, unknown>;
    reason: string;
    status: AiActionStatus;
    autonomyAtTime: string;
    source: AiActionSource;
    error?: string | null;
  }): Promise<AiActionLog> {
    return base.create({
      id: generateId(),
      kind: entry.kind,
      payload: entry.payload,
      reason: entry.reason,
      status: entry.status,
      autonomyAtTime: entry.autonomyAtTime,
      source: entry.source,
      appliedAt: entry.status === "applied" ? new Date().toISOString() : null,
      error: entry.error ?? null,
      sync: createSyncMeta(),
    });
  },

  async setStatus(id: string, status: AiActionStatus, error?: string | null): Promise<void> {
    const existing = await db.aiActions.get(id);
    if (!existing) return;
    await db.aiActions.put({
      ...existing,
      status,
      appliedAt: status === "applied" ? new Date().toISOString() : existing.appliedAt ?? null,
      error: error ?? existing.error ?? null,
      sync: touchSyncMeta(existing.sync),
    });
  },

  /** Proposed actions still waiting on the user, newest first. */
  async getPending(): Promise<AiActionLog[]> {
    return (await base.getAll())
      .filter((a) => a.status === "proposed")
      .sort((a, b) => b.sync.createdAt.localeCompare(a.sync.createdAt));
  },

  async getRecent(limit = 30): Promise<AiActionLog[]> {
    return (await base.getAll())
      .sort((a, b) => b.sync.createdAt.localeCompare(a.sync.createdAt))
      .slice(0, limit);
  },
};
