"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Count } from "@/components/ui/Count";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useDhikrCategories, useAllDhikr, useDhikrProgressForDate } from "@/lib/hooks/useAdhkar";
import { useTimeOfDay } from "@/lib/hooks/useTimeOfDay";
import { todayKey } from "@/lib/time/dateUtils";
import { ROUTES } from "@/lib/constants/routes";

export function AdhkarQuickAccess() {
  const { t } = useTranslation();
  const timeOfDay = useTimeOfDay();
  const categories = useDhikrCategories();
  const allDhikr = useAllDhikr();
  const progress = useDhikrProgressForDate(todayKey());

  const relevantKind = timeOfDay === "morning" ? "morning" : timeOfDay === "night" ? "sleep" : "evening";
  const category = categories?.find((c) => c.kind === relevantKind) ?? categories?.[0];
  const items = allDhikr?.filter((d) => d.categoryId === category?.id) ?? [];
  const completedCount = items.filter((d) =>
    progress?.some((p) => p.dhikrId === d.id && p.count >= d.targetCount),
  ).length;

  if (!category) return null;

  return (
    <section className="flex flex-col gap-2 px-4">
      <h3 className="text-sm font-semibold text-text-secondary">{t("home.adhkarQuickAccess")}</h3>
      <Link href={ROUTES.adhkar}>
        <Card interactive className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent-blue/10 text-accent-blue">
            <Sparkles className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-semibold text-text-primary">{category.title}</p>
            <p className="text-xs text-text-tertiary">
              <Count value={completedCount} total={items.length} />
            </p>
          </div>
        </Card>
      </Link>
    </section>
  );
}
