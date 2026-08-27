"use client";

import { useEffect, useState } from "react";
import { BellOff } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Switch } from "@/components/ui/Switch";
import { TimePicker } from "@/components/ui/TimePicker";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import type { TranslationKey } from "@/lib/i18n/paths";
import type { NotificationPreferences } from "@/lib/types";

export interface NotificationSettingsListProps {
  value: NotificationPreferences;
  onChange: (next: NotificationPreferences) => void;
}

type ToggleKey = Exclude<keyof NotificationPreferences, "quietHoursStart" | "quietHoursEnd">;

const TOGGLES: { key: ToggleKey; labelKey: TranslationKey }[] = [
  { key: "enabled", labelKey: "settings.notificationsEnabled" },
  { key: "appointmentReminders", labelKey: "settings.notifAppointments" },
  { key: "taskDueReminders", labelKey: "settings.notifTasks" },
  { key: "habitReminders", labelKey: "settings.notifHabits" },
  { key: "freeTimeSuggestions", labelKey: "settings.notifFreeTime" },
  { key: "overdueTaskAlerts", labelKey: "settings.notifOverdue" },
  { key: "dailySummary", labelKey: "settings.notifDailySummary" },
];

/**
 * Full notification preferences editor: a Switch per NotificationPreferences field,
 * quiet-hours time range, and a browser permission request button. The permission
 * button only checks/talks to the browser's own Notification API — actually scheduling
 * notifications based on these preferences is a separate, later phase.
 */
export function NotificationSettingsList({ value, onChange }: NotificationSettingsListProps) {
  const { t } = useTranslation();
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "unsupported",
  );

  useEffect(() => {
    // Deferred via setTimeout(0) so the state update happens after mount rather than
    // synchronously inside the effect body (matches the pattern in useInstallPrompt.ts).
    const id = window.setTimeout(() => {
      if (typeof Notification !== "undefined") {
        setPermission(Notification.permission);
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  function setField<K extends keyof NotificationPreferences>(
    key: K,
    fieldValue: NotificationPreferences[K],
  ) {
    onChange({ ...value, [key]: fieldValue });
  }

  async function requestPermission() {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }

  return (
    <div className="flex flex-col gap-4">
      {permission !== "unsupported" && permission !== "granted" && (
        <Card className="flex items-center gap-3 border-warning/30 bg-warning/5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning">
            <BellOff className="size-4" />
          </div>
          <p className="flex-1 text-xs text-text-secondary">{t("settings.notifPermissionDenied")}</p>
          <Button size="sm" variant="secondary" onClick={() => void requestPermission()}>
            {t("settings.notifPermissionButton")}
          </Button>
        </Card>
      )}

      <Card className="flex flex-col divide-y divide-border">
        {TOGGLES.map(({ key, labelKey }) => (
          <div
            key={key}
            className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
          >
            <span className="text-sm text-text-primary">{t(labelKey)}</span>
            <Switch checked={value[key]} onCheckedChange={(checked) => setField(key, checked)} />
          </div>
        ))}
      </Card>

      <Card className="flex flex-col gap-3">
        <p className="text-sm font-medium text-text-primary">{t("settings.notifQuietHours")}</p>
        <div className="flex gap-3">
          <TimePicker
            className="flex-1"
            value={value.quietHoursStart ?? ""}
            onChange={(e) => setField("quietHoursStart", e.target.value)}
          />
          <TimePicker
            className="flex-1"
            value={value.quietHoursEnd ?? ""}
            onChange={(e) => setField("quietHoursEnd", e.target.value)}
          />
        </div>
      </Card>
    </div>
  );
}
