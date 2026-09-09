"use client";

import { Award } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ProgressMeter } from "@/components/ui/ProgressMeter";
import { EmptyState } from "@/components/ui/EmptyState";
import { SubpageHeader } from "@/components/more/SubpageHeader";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useAchievements } from "@/lib/hooks/useAchievements";
import { ROUTES } from "@/lib/constants/routes";

export default function AchievementsPage() {
  const { t } = useTranslation();
  const items = useAchievements();

  return (
    <div className="flex flex-col gap-5 py-2">
      <SubpageHeader title={t("achievements.pageTitle")} backHref={ROUTES.home} />
      <div className="flex flex-col gap-3 px-4">
        {!items ? (
          <div className="h-40 skeleton rounded-2xl" />
        ) : items.every((a) => a.current === 0 && !a.unlocked) ? (
          <EmptyState icon={<Award />} title={t("achievements.empty")} />
        ) : (
          items.map((a) => (
            <Card
              key={a.def.key}
              padding="md"
              className={`flex items-center gap-3.5 ${a.unlocked ? "" : "opacity-70"}`}
            >
              <span
                className={`flex size-11 shrink-0 items-center justify-center rounded-full text-xl ${
                  a.unlocked ? "bg-accent-soft" : "bg-surface-sunken grayscale"
                }`}
              >
                {a.def.emoji}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-text-primary">
                    {t(a.def.titleKey)}
                  </span>
                  <span className="shrink-0 text-[11px] font-medium text-text-tertiary">
                    {a.unlocked ? t("achievements.unlocked") : t("achievements.locked")}
                  </span>
                </div>
                {!a.unlocked && <ProgressMeter current={a.current} target={a.target} size="sm" />}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
