/**
 * `SyncProvider`'s decision — extracted as a pure function so the bug it
 * fixes (and its fix) are independently verifiable without mounting React.
 *
 * The critical distinction: `user === null` means two different things —
 * "the initial session check hasn't resolved yet" and "there is definitely
 * no session." Treating them the same (the original bug) fired `wipeLocal()`
 * on every mount before the real session was known, racing against
 * `DbBootstrap`'s `ensureDefaults()` for the local `settings` row and
 * sometimes deleting it for good — see `SyncProvider.tsx` for the full
 * story and the live reproduction.
 */

export type SyncAction = "idle" | "start" | "wipe";

export interface SyncGateInput {
  configured: boolean;
  /** True until the initial session check resolves — see `AuthProvider`. */
  loading: boolean;
  user: { id: string } | null;
}

export function computeSyncAction({ configured, loading, user }: SyncGateInput): SyncAction {
  if (!configured || loading) return "idle";
  return user ? "start" : "wipe";
}
