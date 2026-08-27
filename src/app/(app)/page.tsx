"use client";

import { GreetingHeader } from "@/components/home/GreetingHeader";
import { SmartSuggestionBanner } from "@/components/home/SmartSuggestionBanner";
import { TodayOverviewCard } from "@/components/home/TodayOverviewCard";
import { UpcomingAppointmentCard } from "@/components/home/UpcomingAppointmentCard";
import { ImportantTaskCard } from "@/components/home/ImportantTaskCard";
import { HabitsProgressStrip } from "@/components/home/HabitsProgressStrip";
import { AdhkarQuickAccess } from "@/components/home/AdhkarQuickAccess";
import { EndOfDaySummaryCard } from "@/components/home/EndOfDaySummaryCard";
import { useTimeOfDay } from "@/lib/hooks/useTimeOfDay";

export default function HomePage() {
  const timeOfDay = useTimeOfDay();
  const isEvening = timeOfDay === "evening" || timeOfDay === "night";

  return (
    <div className="flex flex-col gap-5 pb-6">
      <GreetingHeader timeOfDay={timeOfDay} />
      <SmartSuggestionBanner />
      <TodayOverviewCard />
      {isEvening && <EndOfDaySummaryCard />}
      <UpcomingAppointmentCard />
      <ImportantTaskCard />
      <HabitsProgressStrip />
      <AdhkarQuickAccess />
    </div>
  );
}
