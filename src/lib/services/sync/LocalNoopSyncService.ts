import { syncQueueRepository } from "@/lib/db/repositories";
import type { SyncQueueEntry } from "@/lib/types";
import type { ISyncService, SyncResult, SyncState } from "./ISyncService";

/**
 * Local-only implementation of ISyncService for the current phase of the product,
 * which has no backend at all. This is an *honest* no-op: `enqueue` really does persist
 * entries to the local sync queue (for a future real sync engine to pick up), and
 * `getPendingCount` reports the real queue size — but `sync()` never talks to a server.
 * It always resolves with zero pushed/pulled/errors, because there is nothing to sync
 * with yet. Swapping this for a real networked implementation later should not require
 * any changes to callers, since they only depend on `ISyncService`.
 */
export class LocalNoopSyncService implements ISyncService {
  private state: SyncState = "idle";
  private readonly listeners = new Set<(state: SyncState) => void>();

  getState(): SyncState {
    return this.state;
  }

  private setState(next: SyncState): void {
    if (this.state === next) return;
    this.state = next;
    for (const listener of this.listeners) listener(next);
  }

  async enqueue(entry: Omit<SyncQueueEntry, "id" | "createdAt" | "attempts">): Promise<void> {
    await syncQueueRepository.enqueue(entry);
  }

  async sync(): Promise<SyncResult> {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      this.setState("offline");
      return { pushed: 0, pulled: 0, errors: 0 };
    }
    this.setState("syncing");
    // No backend exists yet — there is genuinely nothing to push or pull. This branch
    // is where a future implementation would talk to a server.
    this.setState("idle");
    return { pushed: 0, pulled: 0, errors: 0 };
  }

  onStateChange(cb: (state: SyncState) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  async getPendingCount(): Promise<number> {
    return syncQueueRepository.count();
  }
}

export const localNoopSyncService = new LocalNoopSyncService();
