"use client";

import Link from "next/link";
import { CalendarRange } from "lucide-react";
import { GreetingHeader } from "@/components/home/GreetingHeader";
import { NowNextCard } from "@/components/home/NowNextCard";
import { RemainingTodayCard } from "@/components/home/RemainingTodayCard";
import { PrayerStrip } from "@/components/home/PrayerStrip";
import { TodayOverviewCard } from "@/components/home/TodayOverviewCard";
import { UpcomingAppointmentCard } from "@/components/home/UpcomingAppointmentCard";
import { HabitsProgressStrip } from "@/components/home/HabitsProgressStrip";
import { AdhkarQuickAccess } from "@/components/home/AdhkarQuickAccess";
import { EndOfDaySummaryCard } from "@/components/home/EndOfDaySummaryCard";
import { useTimeOfDay } from "@/lib/hooks/useTimeOfDay";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { ROUTES } from "@/lib/constants/routes";

/**
 * Home = one answer: "ماذا أفعل الآن؟" first, then a compact progress read,
 * then what's left, then the daily layers. Everything below the hero is
 * progressive disclosure — no wall of stat cards.
 */
export default function HomePage() {
  const timeOfDay = useTimeOfDay();
  const { t } = useTranslation();
  const isEvening = timeOfDay === "evening" || timeOfDay === "night";

  return (
    <div className="flex flex-col gap-4 pb-2">
      <GreetingHeader timeOfDay={timeOfDay} />
      <PrayerStrip />

      <NowNextCard />
      <TodayOverviewCard />
      <RemainingTodayCard />

      <HabitsProgressStrip />
      <AdhkarQuickAccess />
      <UpcomingAppointmentCard />

      {isEvening && <EndOfDaySummaryCard />}

      <Link
        href={ROUTES.plan}
        className="mx-4 flex items-center justify-center gap-2 rounded-lg border border-border bg-surface py-3 text-sm font-semibold text-text-primary transition-colors hover:bg-surface-hover md:mx-0"
      >
        <CalendarRange className="size-4 text-accent-fg" />
        {t("plan.openCta")}
      </Link>
    </div>
  );
}
