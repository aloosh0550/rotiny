"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { CloudOff } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SubpageHeader } from "@/components/more/SubpageHeader";
import { syncQueueRepository } from "@/lib/db/repositories";
import { useSettings } from "@/lib/hooks/useSettings";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { formatFullDate } from "@/lib/time/dateUtils";
import { ROUTES } from "@/lib/constants/routes";

export default function SyncSettingsPage() {
  const { t, locale } = useTranslation();
  const settings = useSettings();
  // .count() is a pure read, so this is safe to call directly inside useLiveQuery.
  const pendingCount = useLiveQuery(() => syncQueueRepository.count(), []);

  return (
    <div className="flex flex-col gap-5 pb-6">
      <SubpageHeader title={t("settings.syncTitle")} backHref={ROUTES.settings} />
      <section className="flex flex-col gap-3 px-4">
        <Card className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-surface-hover text-text-tertiary">
            <CloudOff className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-text-primary">{t("settings.syncNoAccount")}</p>
            {!!pendingCount && (
              <p className="text-xs text-text-tertiary">
                {t("settings.syncStatusPendingCount", { count: pendingCount })}
              </p>
            )}
          </div>
          {!!pendingCount && <Badge tone="neutral">{pendingCount}</Badge>}
        </Card>
        <p className="px-1 text-xs text-text-tertiary">{t("settings.syncExplainer")}</p>
        {settings?.lastSyncedAt && (
          <p className="px-1 text-xs text-text-tertiary">
            {t("settings.syncLastSynced", {
              date: formatFullDate(new Date(settings.lastSyncedAt), locale),
            })}
          </p>
        )}
      </section>
    </div>
  );
}
