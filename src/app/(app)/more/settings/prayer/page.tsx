"use client";

import { Card } from "@/components/ui/Card";
import { Switch } from "@/components/ui/Switch";
import { Select } from "@/components/ui/Select";
import { Chip } from "@/components/ui/Chip";
import { SubpageHeader } from "@/components/more/SubpageHeader";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useSettings } from "@/lib/hooks/useSettings";
import { settingsRepository } from "@/lib/db/repositories";
import { syncReminders } from "@/lib/services/notifications/ReminderScheduler";
import { PRESET_CITIES, type PrayerCalculationMethod } from "@/lib/types";
import { prayerTimesService } from "@/lib/services/prayer/PrayerTimesService";
import { formatTime } from "@/lib/time/dateUtils";
import { ROUTES } from "@/lib/constants/routes";

const METHODS: PrayerCalculationMethod[] = [
  "UmmAlQura",
  "MuslimWorldLeague",
  "Egyptian",
  "Karachi",
  "Dubai",
  "Qatar",
  "Kuwait",
  "MoonsightingCommittee",
  "NorthAmerica",
];
const OFFSETS = [0, 5, 10, 15, 30];

export default function PrayerSettingsPage() {
  const { t, locale } = useTranslation();
  const settings = useSettings();
  const p = settings?.prayerTimes;

  async function patch(next: Partial<NonNullable<typeof p>>) {
    if (!p) return;
    await settingsRepository.update({ prayerTimes: { ...p, ...next } });
    void syncReminders();
  }

  const times = p?.enabled
    ? (() => {
        try {
          return prayerTimesService.dayTimes(p);
        } catch {
          return null;
        }
      })()
    : null;

  return (
    <div className="flex flex-col gap-5 pb-6">
      <SubpageHeader title={t("prayer.title")} backHref={ROUTES.settings} />

      <div className="flex flex-col gap-4 px-4">
        <Card className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-text-primary">{t("prayer.enable")}</span>
          <Switch
            checked={Boolean(p?.enabled)}
            onCheckedChange={(v) => void patch({ enabled: v })}
            label={t("prayer.enable")}
          />
        </Card>

        {p?.enabled && (
          <>
            <Select
              label={t("prayer.city")}
              value={p.city}
              onChange={(e) => {
                const city = e.target.value;
                const preset = PRESET_CITIES[city];
                if (preset) void patch({ city, latitude: preset.lat, longitude: preset.lng });
              }}
              options={Object.entries(PRESET_CITIES).map(([key, v]) => ({ value: key, label: v.label }))}
            />

            <Select
              label={t("prayer.method")}
              value={p.method}
              onChange={(e) => void patch({ method: e.target.value as PrayerCalculationMethod })}
              options={METHODS.map((m) => ({ value: m, label: m }))}
            />

            {times && (
              <Card className="grid grid-cols-3 gap-3">
                {(["fajr", "dhuhr", "asr", "maghrib", "isha", "sunrise"] as const).map((k) => (
                  <div key={k} className="flex flex-col">
                    <span className="text-xs text-text-tertiary">{t(`prayer.${k}`)}</span>
                    <span className="text-sm font-bold tabular-nums text-text-primary">
                      {formatTime(times[k].toISOString(), locale)}
                    </span>
                  </div>
                ))}
              </Card>
            )}

            <Card className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-text-primary">{t("prayer.notify")}</span>
              <Switch
                checked={Boolean(p.notify)}
                onCheckedChange={(v) => void patch({ notify: v })}
                label={t("prayer.notify")}
              />
            </Card>

            {p.notify && (
              <div className="flex flex-wrap gap-2">
                {OFFSETS.map((o) => (
                  <Chip
                    key={o}
                    selected={p.notifyOffsetMinutes === o}
                    onClick={() => void patch({ notifyOffsetMinutes: o })}
                  >
                    {t("prayer.notifyOffset", { count: o })}
                  </Chip>
                ))}
              </div>
            )}
          </>
        )}

        <p className="px-1 text-xs text-text-tertiary">{t("prayer.disabledNote")}</p>
      </div>
    </div>
  );
}
