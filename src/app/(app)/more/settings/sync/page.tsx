"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CloudOff, RefreshCw, RotateCcw, TriangleAlert, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SubpageHeader } from "@/components/more/SubpageHeader";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useSyncState } from "@/lib/hooks/useSyncState";
import {
  getSyncConflicts,
  dismissConflict,
  reapplyConflict,
  type SyncConflict,
} from "@/lib/sync/SyncEngine";
import { formatFullDate } from "@/lib/time/dateUtils";
import { ROUTES } from "@/lib/constants/routes";

function label(c: SyncConflict): string {
  const m = c.mine as { title?: string };
  return m.title ?? c.id.slice(0, 8);
}

export default function SyncSettingsPage() {
  const { t, locale } = useTranslation();
  const { configured, user } = useAuth();
  const sync = useSyncState();
  const [conflicts, setConflicts] = useState<SyncConflict[]>(() => getSyncConflicts());

  useEffect(() => {
    const id = window.setTimeout(() => setConflicts(getSyncConflicts()), 0);
    return () => window.clearTimeout(id);
  }, [sync.conflicts]);

  const refresh = () => setConflicts(getSyncConflicts());

  return (
    <div className="flex flex-col gap-5 pb-6">
      <SubpageHeader title={t("settings.syncTitle")} backHref={ROUTES.settings} />

      <section className="flex flex-col gap-3 px-4">
        {!configured || !user ? (
          <>
            <Card className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-surface-hover text-text-tertiary">
                <CloudOff className="size-5" />
              </div>
              <p className="min-w-0 flex-1 text-sm font-medium text-text-primary">
                {t("settings.syncLocalOnly")}
              </p>
            </Card>
            <p className="px-1 text-xs text-text-tertiary">{t("settings.syncExplainer")}</p>
          </>
        ) : (
          <>
            <Card className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-surface-hover">
                {sync.status === "offline" ? (
                  <CloudOff className="size-5 text-text-tertiary" />
                ) : sync.pending > 0 ? (
                  <RefreshCw className="size-5 text-accent-fg" />
                ) : (
                  <CheckCircle2 className="size-5 text-success" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text-primary">
                  {sync.status === "offline"
                    ? t("auth.offlineNotice")
                    : sync.pending > 0
                      ? t("auth.syncPending", { count: sync.pending })
                      : t("auth.allSynced")}
                </p>
                {sync.lastSyncedAt && (
                  <p className="text-xs text-text-tertiary">
                    {t("settings.syncLastSynced", {
                      date: formatFullDate(new Date(sync.lastSyncedAt), locale),
                    })}
                  </p>
                )}
              </div>
            </Card>

            {conflicts.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="flex items-center gap-1.5 px-1 text-xs font-semibold text-warning">
                  <TriangleAlert className="size-3.5" />
                  {t("settings.syncConflictsTitle")}
                </p>
                {conflicts.map((c) => (
                  <Card key={`${c.id}-${c.at}`} className="flex flex-col gap-2">
                    <p className="truncate text-sm font-medium text-text-primary">{label(c)}</p>
                    <p className="text-xs text-text-tertiary">{t("settings.syncConflictExplain")}</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          void reapplyConflict(c).then(refresh);
                        }}
                      >
                        <RotateCcw className="size-3.5" />
                        {t("settings.syncReapply")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          dismissConflict(c.id);
                          refresh();
                        }}
                      >
                        <X className="size-3.5" />
                        {t("settings.syncDismiss")}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
