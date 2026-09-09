"use client";

import { useState } from "react";
import { CheckCircle2, CloudOff, LogOut, RefreshCw, TriangleAlert } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useSyncState } from "@/lib/hooks/useSyncState";

export function AccountCard() {
  const { t } = useTranslation();
  const { configured, user, signOut } = useAuth();
  const sync = useSyncState();
  const [busy, setBusy] = useState(false);

  if (!configured || !user) return null;

  const statusLine = () => {
    if (sync.status === "offline")
      return { icon: <CloudOff className="size-4 text-text-tertiary" />, text: t("auth.offlineNotice") };
    if (sync.pending > 0)
      return {
        icon: <RefreshCw className="size-4 text-accent-fg" />,
        text: t("auth.syncPending", { count: sync.pending }),
      };
    if (sync.conflicts > 0)
      return {
        icon: <TriangleAlert className="size-4 text-warning" />,
        text: t("auth.conflictsPending", { count: sync.conflicts }),
      };
    return { icon: <CheckCircle2 className="size-4 text-success" />, text: t("auth.allSynced") };
  };

  const s = statusLine();

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-text-tertiary">{t("auth.signedInAs")}</span>
        <span dir="ltr" className="truncate text-sm font-semibold text-text-primary">
          {user.email ?? user.id}
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs text-text-secondary">
        {s.icon}
        <span>{s.text}</span>
      </div>
      <Button
        variant="secondary"
        size="sm"
        loading={busy}
        onClick={() => {
          setBusy(true);
          void signOut();
        }}
      >
        <LogOut className="size-4" />
        {t("auth.signOut")}
      </Button>
    </Card>
  );
}
