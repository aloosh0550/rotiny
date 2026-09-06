"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { syncEngine } from "@/lib/sync/SyncEngine";

/**
 * Starts the SyncEngine while a user is signed in and stops + wipes the local
 * replica on sign-out. No-op when Supabase is unconfigured.
 */
export function SyncProvider() {
  const { configured, user } = useAuth();

  useEffect(() => {
    if (!configured) return;

    if (user) {
      void syncEngine.start(user.id);
      return () => {
        void syncEngine.stop();
      };
    }

    // signed out
    void syncEngine.wipeLocal();
  }, [configured, user]);

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
