"use client";

import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { achievementsRepository } from "@/lib/db/repositories";
import { ACHIEVEMENTS, refreshAchievements, type AchievementDef } from "@/lib/achievements/catalog";
import type { Achievement } from "@/lib/types";

export interface AchievementView {
  def: AchievementDef;
  current: number;
  target: number;
  unlocked: boolean;
  unlockedAt?: string | null;
}

/**
 * The full achievement catalog joined with the user's stored progress. Recomputes
 * from real data on mount (idempotent, sticky unlock).
 */
export function useAchievements(): AchievementView[] | undefined {
  const stored = useLiveQuery(() => achievementsRepository.getAll(), []);

  useEffect(() => {
    void refreshAchievements();
  }, []);

  if (stored === undefined) return undefined;

  const byKey = new Map<string, Achievement>(stored.map((a) => [a.key, a]));
  return ACHIEVEMENTS.map((def) => {
    const row = byKey.get(def.key);
    const current = row?.progress.current ?? 0;
    const target = row?.progress.target ?? def.target;
    return {
      def,
      current,
      target,
      unlocked: !!row?.unlockedAt,
      unlockedAt: row?.unlockedAt ?? null,
    };
  });
}
