"use client";

import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Switch } from "@/components/ui/Switch";
import { Button } from "@/components/ui/Button";
import { SubpageHeader } from "@/components/more/SubpageHeader";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useSettings } from "@/lib/hooks/useSettings";
import { settingsRepository } from "@/lib/db/repositories";
import { calendarSync, type DeviceCalendar } from "@/lib/services/calendar/CalendarSyncService";
import { cn } from "@/lib/utils/cn";
import { ROUTES } from "@/lib/constants/routes";

export default function CalendarSettingsPage() {
  const { t } = useTranslation();
  const settings = useSettings();
  const ci = settings?.calendarIntegration;

  const [permission, setPermission] = useState<"granted" | "denied" | "prompt" | "unsupported">(
    "unsupported",
  );
  const [calendars, setCalendars] = useState<DeviceCalendar[]>([]);

  useEffect(() => {
    let cancelled = false;
    void calendarSync.checkPermission().then((p) => {
      if (cancelled) return;
      setPermission(p);
      if (p === "granted") void calendarSync.listCalendars().then((c) => !cancelled && setCalendars(c));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function patch(next: Partial<NonNullable<typeof ci>>) {
    if (!ci) return;
    await settingsRepository.update({ calendarIntegration: { ...ci, ...next } });
  }

  async function enable() {
    const p = await calendarSync.requestPermission();
    setPermission(p);
    if (p === "granted") {
      const cals = await calendarSync.listCalendars();
      setCalendars(cals);
      await patch({ enabled: true });
    }
  }

  const supported = calendarSync.isSupported();

  return (
    <div className="flex flex-col gap-5 pb-6">
      <SubpageHeader title={t("calendarSync.title")} backHref={ROUTES.settings} />

      <div className="flex flex-col gap-4 px-4">
        {!supported ? (
          <Card className="flex items-center gap-3">
            <CalendarClock className="size-5 shrink-0 text-text-tertiary" />
            <p className="text-sm text-text-secondary">{t("calendarSync.unavailableNote")}</p>
          </Card>
        ) : (
          <>
            <Card className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-text-primary">{t("calendarSync.enable")}</span>
              <Switch
                checked={Boolean(ci?.enabled) && permission === "granted"}
                onCheckedChange={(v) => {
                  if (v && permission !== "granted") void enable();
                  else void patch({ enabled: v });
                }}
                label={t("calendarSync.enable")}
              />
            </Card>

            {permission === "denied" && (
              <Card className="flex flex-col gap-2 border-warning/30 bg-warning/5">
                <p className="text-xs text-text-secondary">{t("calendarSync.denied")}</p>
              </Card>
            )}
            {permission === "prompt" && (
              <Card className="flex items-center gap-3">
                <p className="flex-1 text-xs text-text-secondary">
                  {t("calendarSync.permissionExplain")}
                </p>
                <Button size="sm" onClick={() => void enable()}>
                  {t("calendarSync.grant")}
                </Button>
              </Card>
            )}

            {ci?.enabled && permission === "granted" && calendars.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-text-secondary">
                  {t("calendarSync.pickCalendar")}
                </span>
                {calendars.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() =>
                      void patch({ deviceCalendarId: c.id, deviceCalendarName: c.title })
                    }
                    className={cn(
                      "flex items-center justify-between rounded-lg border px-3.5 py-3 text-sm",
                      ci.deviceCalendarId === c.id
                        ? "border-accent bg-accent-soft text-accent-fg"
                        : "border-border bg-surface text-text-primary",
                    )}
                  >
                    {c.title}
                  </button>
                ))}
              </div>
            )}

            {ci?.enabled && (
              <Card className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-text-primary">
                  {t("calendarSync.showDeviceEvents")}
                </span>
                <Switch
                  checked={Boolean(ci.showDeviceEvents)}
                  onCheckedChange={(v) => void patch({ showDeviceEvents: v })}
                  label={t("calendarSync.showDeviceEvents")}
                />
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
