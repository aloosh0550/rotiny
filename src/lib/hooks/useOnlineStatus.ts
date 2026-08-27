"use client";

import { useEffect, useState } from "react";

export function useOnlineStatus(): boolean {
  // Deterministic default on server and first client render; corrected client-side in the effect
  // below (navigator.onLine isn't available during SSR and reading it in a lazy initializer
  // could mismatch the server-rendered output).
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const syncId = window.setTimeout(() => setOnline(navigator.onLine), 0);
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.clearTimeout(syncId);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return online;
}
