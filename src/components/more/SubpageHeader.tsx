"use client";

import Link from "next/link";
import { IconButton } from "@/components/ui/IconButton";
import { DirectionalIcon } from "@/components/ui/DirectionalIcon";
import { useTranslation } from "@/lib/i18n/I18nProvider";

/**
 * The shared TopBar shows a generic title for every /more/settings/* route (they all
 * share the "settings" prefix), so each settings subpage renders its own small header
 * with a back link and its specific title.
 */
export function SubpageHeader({
  title,
  backHref,
  action,
}: {
  title: string;
  backHref: string;
  action?: React.ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-1 px-2 pt-2">
      <Link href={backHref}>
        <IconButton
          icon={<DirectionalIcon direction="back" className="size-5" />}
          label={t("common.back")}
          variant="ghost"
        />
      </Link>
      <h2 className="min-w-0 flex-1 truncate text-lg font-bold text-text-primary">{title}</h2>
      {action && <div className="shrink-0 pe-2">{action}</div>}
    </div>
  );
}
