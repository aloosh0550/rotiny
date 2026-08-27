"use client";

import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n/I18nProvider";

export default function OfflinePage() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-warning/10 text-warning">
        <WifiOff className="size-7" />
      </div>
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-text-primary">{t("common.offline")}</h1>
        <p className="max-w-xs text-sm text-text-tertiary">{t("common.offlineBanner")}</p>
      </div>
      <Button onClick={() => window.location.reload()}>{t("common.retryConnection")}</Button>
    </div>
  );
}
