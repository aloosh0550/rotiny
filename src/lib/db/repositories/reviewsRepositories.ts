import { db } from "@/lib/db/schema";
import type { Achievement, Review, ReviewMetrics, ReviewPeriod } from "@/lib/types";
import { createSyncMeta } from "@/lib/utils/sync";
import { syncEngine } from "@/lib/sync/SyncEngine";
import { makeSyncedRepository } from "./helpers";

function reviewId(period: ReviewPeriod, key: string): string {
  return `${syncEngine.currentUserId() ?? "local"}:${period}:${key}`;
}
function achievementId(key: string): string {
  return `${syncEngine.currentUserId() ?? "local"}:${key}`;
}

const reviews = makeSyncedRepository<Review>(db.reviews, "reviews");
const achievements = makeSyncedRepository<Achievement>(db.achievements, "achievements");

export const reviewsRepository = {
  ...reviews,

  async getForPeriod(period: ReviewPeriod, key: string): Promise<Review | undefined> {
    const byId = await reviews.getById(reviewId(period, key));
    if (byId) return byId;
    return (await reviews.getAll()).find((r) => r.period === period && r.periodKey === key);
  },

  async getRecent(period: ReviewPeriod, limit = 12): Promise<Review[]> {
    return (await reviews.getAll())
      .filter((r) => r.period === period)
      .sort((a, b) => b.periodKey.localeCompare(a.periodKey))
      .slice(0, limit);
  },

  async upsertForPeriod(
    period: ReviewPeriod,
    key: string,
    metrics: ReviewMetrics,
    aiNote?: string | null,
  ): Promise<Review> {
    const existing = await this.getForPeriod(period, key);
    if (existing) return reviews.update(existing.id, { metrics, aiNote: aiNote ?? existing.aiNote ?? null });
    return reviews.create({
      id: reviewId(period, key),
      period,
      periodKey: key,
      metrics,
      aiNote: aiNote ?? null,
      sync: createSyncMeta(),
    });
  },
};

export const achievementsRepository = {
  ...achievements,

  async getByKey(key: string): Promise<Achievement | undefined> {
    const byId = await achievements.getById(achievementId(key));
    if (byId) return byId;
    return (await achievements.getAll()).find((a) => a.key === key);
  },

  /** Record progress for an achievement; unlock (once) when target is reached. */
  async setProgress(key: string, current: number, target: number): Promise<Achievement> {
    const existing = await this.getByKey(key);
    const reached = target > 0 && current >= target;
    if (existing) {
      const unlockedAt = existing.unlockedAt ?? (reached ? new Date().toISOString() : null);
      return achievements.update(existing.id, {
        progress: { current, target },
        unlockedAt,
      });
    }
    return achievements.create({
      id: achievementId(key),
      key,
      unlockedAt: reached ? new Date().toISOString() : null,
      progress: { current, target },
      sync: createSyncMeta(),
    });
  },
};
