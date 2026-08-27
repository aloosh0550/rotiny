"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { settingsRepository } from "@/lib/db/repositories";
import type { UserSettings } from "@/lib/types";

export function useSettings(): UserSettings | undefined {
  return useLiveQuery(() => settingsRepository.get(), []);
}
