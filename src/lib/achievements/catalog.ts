import {
  achievementsRepository,
  habitsRepository,
  habitCompletionsRepository,
  goalsRepository,
  reviewsRepository,
} from "@/lib/db/repositories";
import { computeHabitStats } from "@/lib/time/streak";
import type { TranslationKey } from "@/lib/i18n/paths";

export interface AchievementDef {
  key: string;
  titleKey: TranslationKey;
  emoji: string;
  target: number;
}

/** Calm, positive milestones — no punishment, no gamification noise. */
export const ACHIEVEMENTS: AchievementDef[] = [
  { key: "streak_7", titleKey: "achievements.streak7", emoji: "🔥", target: 7 },
  { key: "streak_30", titleKey: "achievements.streak30", emoji: "🌱", target: 30 },
  { key: "exercise_20", titleKey: "achievements.exercise20", emoji: "🏆", target: 20 },
  { key: "reading_week", titleKey: "achievements.readingWeek", emoji: "📖", target: 7 },
  { key: "first_goal", titleKey: "achievements.firstGoal", emoji: "🎯", target: 1 },
  { key: "great_week", titleKey: "achievements.greatWeek", emoji: "⭐", target: 90 },
];

export function achievementDef(key: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.key === key);
}

/**
 * Recompute every achievement's progress from real data. Idempotent — safe to
 * call after any mutation or on page load. Unlock is sticky (never reverts).
 */
export async function refreshAchievements(): Promise<void> {
  const [habits, completions, goals, weeklyReviews] = await Promise.all([
    habitsRepository.getActive(),
    habitCompletionsRepository.getAll(),
    goalsRepository.getAll(),
    reviewsRepository.getRecent("week", 26),
  ]);

  // best current + longest streak across all habits
  let bestCurrent = 0;
  for (const h of habits) {
    const cs = completions.filter((c) => c.habitId === h.id);
    const stats = computeHabitStats(h.recurrence, new Date(h.sync.createdAt), cs);
    bestCurrent = Math.max(bestCurrent, stats.current, stats.longest);
  }
  await achievementsRepository.setProgress("streak_7", Math.min(bestCurrent, 7), 7);
  await achievementsRepository.setProgress("streak_30", Math.min(bestCurrent, 30), 30);

  // exercise / reading tracker completion counts
  const exerciseHabitIds = new Set(habits.filter((h) => h.trackerKind === "exercise").map((h) => h.id));
  const readingHabitIds = new Set(habits.filter((h) => h.trackerKind === "reading").map((h) => h.id));
  const exerciseDays = completions.filter((c) => exerciseHabitIds.has(c.habitId)).length;
  await achievementsRepository.setProgress("exercise_20", Math.min(exerciseDays, 20), 20);

  // reading logged on 7 distinct days
  const readingDates = new Set(
    completions.filter((c) => readingHabitIds.has(c.habitId)).map((c) => c.date),
  );
  await achievementsRepository.setProgress("reading_week", Math.min(readingDates.size, 7), 7);

  // first completed goal
  const doneGoals = goals.filter((g) => g.status === "done" && !g.sync.deletedAt).length;
  await achievementsRepository.setProgress("first_goal", Math.min(doneGoals, 1), 1);

  // best weekly completion pct seen
  const bestWeek = weeklyReviews.reduce((mx, r) => Math.max(mx, r.metrics.completionPct ?? 0), 0);
  await achievementsRepository.setProgress("great_week", Math.min(bestWeek, 90), 90);

}
