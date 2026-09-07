"use client";

import { useState } from "react";
import { CheckCircle2, Flame, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { EmptyState } from "@/components/ui/EmptyState";
import { SubpageHeader } from "@/components/more/SubpageHeader";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useReview } from "@/lib/hooks/useReview";
import { useLifeAreas } from "@/lib/hooks/useAreasGoals";
import { ROUTES } from "@/lib/constants/routes";
import type { ReviewPeriod } from "@/lib/types";

export default function ReviewsPage() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<ReviewPeriod>("day");
  const { metrics } = useReview(period);
  const areas = useLifeAreas() ?? [];
  const areaName = (key: string) => areas.find((a) => a.key === key)?.name ?? key;

  return (
    <div className="flex flex-col gap-5 py-2">
      <SubpageHeader title={t("reviews.pageTitle")} backHref={ROUTES.home} />
      <div className="flex flex-col gap-4 px-4">
        <Tabs
          items={[
            { value: "day", label: t("reviews.day") },
            { value: "week", label: t("reviews.week") },
            { value: "month", label: t("reviews.month") },
          ]}
          value={period}
          onChange={(v) => setPeriod(v as ReviewPeriod)}
        />

        {!metrics ? (
          <div className="h-40 skeleton rounded-2xl" />
        ) : metrics.tasksDue + metrics.habitsDue === 0 ? (
          <EmptyState title={t("reviews.nothingYet")} />
        ) : (
          <>
            <Card padding="md" className="flex items-center gap-4">
              <ProgressRing value={metrics.completionPct / 100} size={64}>
                <span className="text-sm font-bold text-text-primary">{metrics.completionPct}%</span>
              </ProgressRing>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-sm">
                <span className="font-semibold text-text-primary">{t("reviews.completion")}</span>
                {metrics.deltaPct != null && metrics.deltaPct !== 0 && (
                  <span
                    className={`flex items-center gap-1 text-xs ${
                      metrics.deltaPct > 0 ? "text-success" : "text-text-tertiary"
                    }`}
                  >
                    {metrics.deltaPct > 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                    {t(metrics.deltaPct > 0 ? "reviews.deltaUp" : "reviews.deltaDown", {
                      pct: Math.abs(metrics.deltaPct),
                    })}
                  </span>
                )}
              </div>
            </Card>

            <section className="flex flex-col gap-2">
              <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-text-secondary">
                <CheckCircle2 className="size-3.5" /> {t("reviews.done")}
              </h2>
              <Card padding="sm" className="flex flex-col gap-1 text-sm text-text-secondary">
                <span>{t("reviews.tasksLine", { done: metrics.tasksDone, total: metrics.tasksDue })}</span>
                <span>{t("reviews.habitsLine", { done: metrics.habitsDone, total: metrics.habitsDue })}</span>
                {!!metrics.adhkarDays && <span>{t("reviews.adhkarLine", { days: metrics.adhkarDays })}</span>}
                {!!metrics.bestStreak && (
                  <span className="flex items-center gap-1 text-text-primary">
                    <Flame className="size-3.5 text-accent-fg" />
                    {t("reviews.bestStreak", { count: metrics.bestStreak })}
                  </span>
                )}
              </Card>
            </section>

            {metrics.weakestArea && metrics.areas?.[metrics.weakestArea] != null && (
              <section className="flex flex-col gap-2">
                <h2 className="text-[13px] font-semibold text-text-secondary">{t("reviews.needsAttention")}</h2>
                <Card padding="sm" className="text-sm text-text-secondary">
                  {areaName(metrics.weakestArea)} — {metrics.areas[metrics.weakestArea]}%
                </Card>
              </section>
            )}

            <section className="flex flex-col gap-2">
              <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-text-secondary">
                <Sparkles className="size-3.5" /> {t("reviews.suggestion")}
              </h2>
              <Card padding="sm" className="text-sm text-text-secondary">
                {metrics.completionPct >= 75
                  ? t("reviews.suggestKeep")
                  : metrics.weakestArea
                    ? t("reviews.suggestFocus", { area: areaName(metrics.weakestArea) })
                    : metrics.completionPct < 40
                      ? t("reviews.suggestGentle")
                      : t("reviews.suggestKeep")}
              </Card>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
