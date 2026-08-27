"use client";

import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import { useTranslation } from "@/lib/i18n/I18nProvider";

export function OfflineBanner() {
  const online = useOnlineStatus();
  const { t } = useTranslation();

  if (online) return null;

  return (
    <div className="flex items-center gap-2 bg-warning/10 px-4 py-2 text-xs font-medium text-warning">
      <WifiOff className="size-3.5 shrink-0" />
      <span>{t("common.offlineBanner")}</span>
    </div>
  );
}
