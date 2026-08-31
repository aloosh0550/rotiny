"use client";

import Link from "next/link";
import { Sun, Moon, Sunset } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Count } from "@/components/ui/Count";
import { IconTile } from "@/components/ui/IconTile";
import { DirectionalIcon } from "@/components/ui/DirectionalIcon";
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
  const Icon = relevantKind === "morning" ? Sun : relevantKind === "sleep" ? Moon : Sunset;

  return (
    <section className="flex flex-col gap-2 px-4 md:px-0">
      <h3 className="text-[13px] font-semibold text-text-secondary">{t("home.adhkarQuickAccess")}</h3>
      <Link href={ROUTES.adhkar}>
        <Card interactive className="flex items-center gap-3 py-3">
          <IconTile color="violet">
            <Icon />
          </IconTile>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-text-primary">{category.title}</p>
            <p className="text-xs text-text-tertiary">
              <Count value={completedCount} total={items.length} />
            </p>
          </div>
          <DirectionalIcon className="size-4 text-text-tertiary" />
        </Card>
      </Link>
    </section>
  );
}
