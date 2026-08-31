"use client";

import { useMemo } from "react";
import { MoonStar } from "lucide-react";
import { useSettings } from "@/lib/hooks/useSettings";
import { useNow } from "@/lib/hooks/useNow";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { prayerTimesService, type PrayerName } from "@/lib/services/prayer/PrayerTimesService";

const NAME_KEY: Record<PrayerName, "fajr" | "sunrise" | "dhuhr" | "asr" | "maghrib" | "isha"> = {
  fajr: "fajr",
  sunrise: "sunrise",
  dhuhr: "dhuhr",
  asr: "asr",
  maghrib: "maghrib",
  isha: "isha",
};

function fmtRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function PrayerStrip() {
  const settings = useSettings();
  const now = useNow(30_000);
  const { t } = useTranslation();

  const next = useMemo(() => {
    if (!settings?.prayerTimes.enabled) return null;
    try {
      return prayerTimesService.next(settings.prayerTimes, now);
    } catch {
      return null;
    }
  }, [settings, now]);

  if (!next) return null;

  return (
    <div className="mx-4 flex items-center gap-3 rounded-lg border border-accent/20 bg-accent-soft px-3.5 py-2.5 md:mx-0">
      <MoonStar className="size-4 shrink-0 text-accent-fg" />
      <span className="text-[13px] font-semibold text-text-primary">
        {t("prayer.next")}: {t(`prayer.${NAME_KEY[next.name]}`)}
      </span>
      <span className="ms-auto text-[13px] font-bold tabular-nums text-accent-fg">
        {t("prayer.remaining", { time: fmtRemaining(next.remainingMs) })}
      </span>
    </div>
  );
}
