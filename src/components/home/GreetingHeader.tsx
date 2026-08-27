"use client";

import { useTranslation } from "@/lib/i18n/I18nProvider";
import { formatFullDate } from "@/lib/time/dateUtils";
import type { TimeOfDay } from "@/lib/hooks/useTimeOfDay";

const GREETING_KEY: Record<TimeOfDay, "greetingMorning" | "greetingAfternoon" | "greetingEvening" | "greetingNight"> = {
  morning: "greetingMorning",
  afternoon: "greetingAfternoon",
  evening: "greetingEvening",
  night: "greetingNight",
};

const LABEL_KEY: Record<TimeOfDay, "todayLabel" | "afternoonLabel" | "eveningLabel"> = {
  morning: "todayLabel",
  afternoon: "afternoonLabel",
  evening: "eveningLabel",
  night: "eveningLabel",
};

export function GreetingHeader({ timeOfDay }: { timeOfDay: TimeOfDay }) {
  const { t, locale } = useTranslation();

  return (
    <div className="flex flex-col gap-1 px-4 pt-5 md:px-0 md:pt-0">
      <p className="text-sm font-medium text-text-tertiary">{formatFullDate(new Date(), locale)}</p>
      <h2 className="text-[26px] font-bold leading-tight text-text-primary sm:text-3xl">
        {t(`home.${GREETING_KEY[timeOfDay]}`)}
      </h2>
      <p className="text-sm font-semibold text-accent-fg">{t(`home.${LABEL_KEY[timeOfDay]}`)}</p>
    </div>
  );
}
