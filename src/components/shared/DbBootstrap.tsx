"use client";

import { useEffect } from "react";
import { settingsRepository, lifeAreasRepository } from "@/lib/db/repositories";
import { isSupabaseConfigured } from "@/lib/config/env";

/** Ensures the baseline records exist before anything reads them. Idempotent. */
export function DbBootstrap() {
  useEffect(() => {
    void (async () => {
      await settingsRepository.ensureDefaults();
      // In cloud mode the SyncEngine seeds default Life Areas after the initial
      // pull (so a second device doesn't create key-duplicates). Local-only mode
      // seeds them here.
      if (!isSupabaseConfigured()) {
        await lifeAreasRepository.ensureDefaults().catch(() => {});
      }
    })();
  }, []);

  return null;
}
