"use client";

import { BatteryFull, BatteryLow, BatteryMedium, BatteryWarning } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useTodayEnergy } from "@/lib/hooks/useLocalPlan";
import { dailyEnergyRepository } from "@/lib/db/repositories";
import { todayKey } from "@/lib/time/dateUtils";
import type { EnergyLevel } from "@/lib/types";

const OPTIONS: { level: EnergyLevel; icon: typeof BatteryFull }[] = [
  { level: "high", icon: BatteryFull },
  { level: "good", icon: BatteryMedium },
  { level: "medium", icon: BatteryLow },
  { level: "low", icon: BatteryWarning },
];

/**
 * Morning energy check-in. One tap, skippable, shown only before noon while
 * today's level isn't set. Feeds the deterministic planner's ranking.
 */
export function EnergyCheckIn() {
  const { t } = useTranslation();
  const energy = useTodayEnergy();

  const hour = new Date().getHours();
  if (energy === undefined) return null; // still loading
  if (energy !== null) return null; // already answered
  if (hour >= 12) return null; // morning only

  return (
    <Card className="mx-4 flex flex-col gap-2.5 md:mx-0">
      <span className="text-sm font-semibold text-text-primary">{t("energy.question")}</span>
      <div className="flex gap-2">
        {OPTIONS.map(({ level, icon: Icon }) => (
          <button
            key={level}
            type="button"
            onClick={() => void dailyEnergyRepository.setForDate(todayKey(), level)}
            className="flex flex-1 flex-col items-center gap-1 rounded-lg border border-border bg-surface py-2.5 text-text-secondary transition-colors hover:border-accent hover:text-accent-fg"
          >
            <Icon className="size-5" />
            <span className="text-[11px] font-medium">{t(`energy.${level}`)}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}
