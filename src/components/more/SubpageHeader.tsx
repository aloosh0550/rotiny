"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { useTranslation } from "@/lib/i18n/I18nProvider";

/**
 * The shared TopBar shows a generic title for every /more/settings/* route (they all
 * share the "settings" prefix), so each settings subpage renders its own small header
 * with a back link and its specific title.
 */
export function SubpageHeader({ title, backHref }: { title: string; backHref: string }) {
  const { t, dir } = useTranslation();
  const BackIcon = dir === "rtl" ? ChevronRight : ChevronLeft;

  return (
    <div className="flex items-center gap-1 px-2 pt-2">
      <Link href={backHref}>
        <IconButton icon={<BackIcon className="size-5" />} label={t("common.back")} variant="ghost" />
      </Link>
      <h2 className="text-base font-semibold text-text-primary">{title}</h2>
    </div>
  );
}
