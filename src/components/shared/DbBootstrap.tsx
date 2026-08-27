"use client";

import { useEffect } from "react";
import { settingsRepository } from "@/lib/db/repositories";

/** Ensures a settings record exists before anything reads it via useSettings(). */
export function DbBootstrap() {
  useEffect(() => {
    void settingsRepository.ensureDefaults();
  }, []);

  return null;
}
