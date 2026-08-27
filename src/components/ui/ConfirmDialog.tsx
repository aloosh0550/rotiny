"use client";

import { Sheet } from "./Sheet";
import { Button } from "./Button";
import { useTranslation } from "@/lib/i18n/I18nProvider";

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  body?: string;
  confirmLabel?: string;
  destructive?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel,
  destructive = true,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  return (
    <Sheet open={open} onClose={onClose} closeLabel={t("common.close")}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-semibold text-text-primary">
            {title ?? t("common.deleteConfirmTitle")}
          </h3>
          <p className="text-sm text-text-secondary">{body ?? t("common.deleteConfirmBody")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" fullWidth onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            variant={destructive ? "destructive" : "primary"}
            fullWidth
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel ?? t("common.delete")}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
