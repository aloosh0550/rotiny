"use client";

import { Skeleton } from "@/components/ui/Skeleton";
import { NotificationSettingsList } from "@/components/more/NotificationSettingsList";
import { SubpageHeader } from "@/components/more/SubpageHeader";
import { useSettings } from "@/lib/hooks/useSettings";
import { settingsRepository } from "@/lib/db/repositories";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { ROUTES } from "@/lib/constants/routes";
import type { NotificationPreferences } from "@/lib/types";

export default function NotificationsSettingsPage() {
  const { t } = useTranslation();
  const settings = useSettings();

  function handleChange(next: NotificationPreferences) {
    void settingsRepository.update({ notifications: next });
  }

  return (
    <div className="flex flex-col gap-5 pb-6">
      <SubpageHeader title={t("settings.notificationsTitle")} backHref={ROUTES.settings} />
      <section className="px-4">
        {!settings ? (
          <Skeleton className="h-72" />
        ) : (
          <NotificationSettingsList value={settings.notifications} onChange={handleChange} />
        )}
      </section>
    </div>
  );
}
