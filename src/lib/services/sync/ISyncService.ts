import type { SyncQueueEntry } from "@/lib/types";

export type SyncState = "idle" | "syncing" | "error" | "offline";

export interface SyncResult {
  pushed: number;
  pulled: number;
  errors: number;
}

/**
 * Abstraction over "make local changes eventually consistent with a remote store."
 * There is no backend yet — see `LocalNoopSyncService` for the current honest
 * implementation — but downstream UI (the sync settings page) and future feature code
 * can depend on this interface without caring whether sync is real yet.
 */
export interface ISyncService {
  getState(): SyncState;
  enqueue(entry: Omit<SyncQueueEntry, "id" | "createdAt" | "attempts">): Promise<void>;
  sync(): Promise<SyncResult>;
  onStateChange(cb: (state: SyncState) => void): () => void;
  getPendingCount(): Promise<number>;
}
