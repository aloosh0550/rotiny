"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { formatTime } from "@/lib/time/dateUtils";
import type { Appointment } from "@/lib/types";

export interface ConflictBannerProps {
  conflicts: Appointment[];
  onSaveAnyway: () => void;
  onGoBack: () => void;
}

export function ConflictBanner({ conflicts, onSaveAnyway, onGoBack }: ConflictBannerProps) {
  const { t, locale } = useTranslation();

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-warning/30 bg-warning/10 p-3.5">
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-semibold text-text-primary">{t("appointments.conflictTitle")}</p>
          <p className="text-xs text-text-secondary">{t("appointments.conflictBody")}</p>
          <ul className="flex flex-col gap-0.5">
            {conflicts.map((conflict) => (
              <li key={conflict.id} className="truncate text-xs text-text-tertiary">
                {conflict.title} · {formatTime(conflict.startAt, locale)}–{formatTime(conflict.endAt, locale)}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" size="sm" fullWidth onClick={onGoBack}>
          {t("appointments.conflictLetMeChoose")}
        </Button>
        <Button type="button" variant="primary" size="sm" fullWidth onClick={onSaveAnyway}>
          {t("appointments.conflictSaveAnyway")}
        </Button>
      </div>
    </div>
  );
}
