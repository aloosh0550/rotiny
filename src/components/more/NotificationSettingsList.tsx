"use client";

import { useEffect, useState } from "react";
import { BellOff } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Switch } from "@/components/ui/Switch";
import { TimePicker } from "@/components/ui/TimePicker";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import type { TranslationKey } from "@/lib/i18n/paths";
import type { AdhkarReminderTimes, NotificationPreferences } from "@/lib/types";
import { getNotificationService } from "@/lib/services/notifications";

export interface NotificationSettingsListProps {
  value: NotificationPreferences;
  onChange: (next: NotificationPreferences) => void;
}

type BoolKey =
  | "enabled"
  | "appointmentReminders"
  | "taskDueReminders"
  | "habitReminders"
  | "adhkarReminders"
  | "overdueTaskAlerts"
  | "dailySummary"
  | "dailyPlanReminder";

const TOGGLES: { key: BoolKey; labelKey: TranslationKey }[] = [
  { key: "enabled", labelKey: "settings.notificationsEnabled" },
  { key: "appointmentReminders", labelKey: "settings.notifAppointments" },
  { key: "taskDueReminders", labelKey: "settings.notifTasks" },
  { key: "habitReminders", labelKey: "settings.notifHabits" },
  { key: "adhkarReminders", labelKey: "notificationsExtra.adhkarReminders" },
  { key: "overdueTaskAlerts", labelKey: "settings.notifOverdue" },
  { key: "dailySummary", labelKey: "settings.notifDailySummary" },
  { key: "dailyPlanReminder", labelKey: "notificationsExtra.dailyPlanReminder" },
];

const ADHKAR_TIME_ROWS: { key: keyof AdhkarReminderTimes; labelKey: TranslationKey }[] = [
  { key: "wake", labelKey: "adhkar.categoryWake" },
  { key: "morning", labelKey: "adhkar.categoryMorning" },
  { key: "afterPrayer", labelKey: "adhkar.categoryAfterPrayer" },
  { key: "istighfar", labelKey: "adhkar.categoryIstighfar" },
  { key: "evening", labelKey: "adhkar.categoryEvening" },
  { key: "sleep", labelKey: "adhkar.categorySleep" },
];

const DEFAULT_OFFSET_OPTIONS = [0, 5, 10, 30, 60];

export function NotificationSettingsList({ value, onChange }: NotificationSettingsListProps) {
  const { t } = useTranslation();
  const [permission, setPermission] = useState<"granted" | "denied" | "prompt" | "unsupported">(
    "unsupported",
  );

  useEffect(() => {
    let cancelled = false;
    void getNotificationService()
      .getPermission()
      .then((p) => {
        if (!cancelled) setPermission(p);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  function setField<K extends keyof NotificationPreferences>(
    key: K,
    fieldValue: NotificationPreferences[K],
  ) {
    onChange({ ...value, [key]: fieldValue });
  }

  function setAdhkarTime(key: keyof AdhkarReminderTimes, time: string) {
    onChange({ ...value, adhkarTimes: { ...value.adhkarTimes, [key]: time } });
  }

  async function requestPermission() {
    const result = await getNotificationService().requestPermission();
    setPermission(result);
  }

  return (
    <div className="flex flex-col gap-4">
      {permission === "denied" && (
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
      {permission === "prompt" && (
        <Card className="flex items-center gap-3">
          <p className="flex-1 text-xs text-text-secondary">
            {t("notificationsExtra.permissionExplain")}
          </p>
          <Button size="sm" onClick={() => void requestPermission()}>
            {t("notificationsExtra.grant")}
          </Button>
        </Card>
      )}

      <Card className="flex flex-col divide-y divide-border">
        {TOGGLES.map(({ key, labelKey }) => (
          <div key={key} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <span className="text-sm text-text-primary">{t(labelKey)}</span>
            <Switch
              checked={Boolean(value[key])}
              onCheckedChange={(checked) => setField(key, checked)}
            />
          </div>
        ))}
      </Card>

      {value.dailyPlanReminder && (
        <Card className="flex items-center justify-between gap-3">
          <span className="text-sm text-text-primary">
            {t("notificationsExtra.dailyPlanReminderTime")}
          </span>
          <TimePicker
            className="w-32"
            value={value.dailyPlanReminderTime}
            onChange={(e) => setField("dailyPlanReminderTime", e.target.value)}
          />
        </Card>
      )}

      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-text-secondary">
          {t("notificationsExtra.reminderDefaults")}
        </span>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_OFFSET_OPTIONS.map((o) => {
            const active = (value.reminderDefaults ?? []).includes(o);
            return (
              <Chip
                key={o}
                selected={active}
                onClick={() =>
                  setField(
                    "reminderDefaults",
                    active
                      ? value.reminderDefaults.filter((x) => x !== o)
                      : [...(value.reminderDefaults ?? []), o].sort((a, b) => a - b),
                  )
                }
              >
                {o === 0
                  ? t("reminders.atTime")
                  : o === 60
                    ? t("reminders.hourBefore")
                    : t("reminders.minutesBefore", { count: o })}
              </Chip>
            );
          })}
        </div>
      </div>

      {value.adhkarReminders && (
        <Card className="flex flex-col divide-y divide-border">
          {ADHKAR_TIME_ROWS.map(({ key, labelKey }) => (
            <div
              key={key}
              className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <span className="text-sm text-text-primary">{t(labelKey)}</span>
              <TimePicker
                className="w-32"
                value={value.adhkarTimes[key]}
                onChange={(e) => setAdhkarTime(key, e.target.value)}
              />
            </div>
          ))}
        </Card>
      )}

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

      <p className="px-1 text-xs text-text-tertiary">{t("notificationsExtra.unavailableNote")}</p>
    </div>
  );
}
