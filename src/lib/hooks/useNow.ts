"use client";

import { useEffect, useState } from "react";

/** Returns the current time as state, refreshed on an interval — avoids calling
 * impure Date APIs directly during render (flagged by the React Compiler's purity rule). */
export function useNow(refreshMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), refreshMs);
    return () => window.clearInterval(id);
  }, [refreshMs]);

  return now;
}
