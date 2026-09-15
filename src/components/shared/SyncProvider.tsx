"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { syncEngine } from "@/lib/sync/SyncEngine";
import { computeSyncAction } from "@/lib/auth/syncGate";

/**
 * Starts the SyncEngine while a user is signed in and stops + wipes the local
 * replica on sign-out. No-op when Supabase is unconfigured.
 *
 * Waits for `loading` to resolve before deciding anything. `user` is null
 * both while the initial session check is still in flight AND once it's
 * genuinely confirmed there's no session — treating those as the same thing
 * used to fire `wipeLocal()` on every mount before the real session was
 * known. That raced against `DbBootstrap`'s `ensureDefaults()` (which also
 * runs on mount) for the local `settings` row: whichever finished last won,
 * and losing meant `settings` was deleted with nothing left to recreate it —
 * a permanent blank screen, since the route gate's onboarding redirect
 * itself requires `settings` to exist (see `routeGate.ts`). Reproduced live
 * on Production: the row existed briefly after page load, then was gone for
 * good. Most visible right after a brand-new sign-up, which has no cloud
 * settings row for a later pull to restore.
 */
export function SyncProvider() {
  const { configured, loading, user } = useAuth();

  useEffect(() => {
    const action = computeSyncAction({ configured, loading, user });
    if (action === "idle") return;

    if (action === "start") {
      void syncEngine.start(user!.id);
      return () => {
        void syncEngine.stop();
      };
    }

    // action === "wipe": genuinely signed out (not just "still checking")
    void syncEngine.wipeLocal();
  }, [configured, loading, user]);

  // Re-flush when the tab regains focus / the app resumes.
  useEffect(() => {
    if (!configured || !user) return;
    const onFocus = () => void syncEngine.flush();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [configured, user]);

  return null;
}
