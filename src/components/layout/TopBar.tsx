"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal, Search } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { Logo } from "@/components/ui/Logo";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import type { TranslationKey } from "@/lib/i18n/paths";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";

type Translator = (key: TranslationKey, params?: Record<string, string | number>) => string;

function getTitle(pathname: string, t: Translator): string {
  if (pathname === ROUTES.home) return t("common.appName");
  if (pathname.startsWith(ROUTES.appointments)) return t("appointments.pageTitle");
  if (pathname.startsWith(ROUTES.tasks)) return t("tasks.pageTitle");
  if (pathname.startsWith(ROUTES.habits)) return t("habits.pageTitle");
  if (pathname.startsWith(ROUTES.adhkar)) return t("adhkar.pageTitle");
  if (pathname.startsWith(ROUTES.search)) return t("nav.search");
  if (pathname.startsWith(ROUTES.statistics)) return t("statistics.pageTitle");
  if (pathname.startsWith(ROUTES.settings)) return t("settings.pageTitle");
  if (pathname.startsWith(ROUTES.more)) return t("more.pageTitle");
  return t("common.appName");
}

export function TopBar() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const title = getTitle(pathname, t);
  const isHome = pathname === ROUTES.home;
  const onSearchPage = pathname.startsWith(ROUTES.search);
  const onMorePage = pathname.startsWith(ROUTES.more);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-bg/80 px-4 backdrop-blur-lg",
        "md:hidden",
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {isHome ? (
          <>
            <Logo size={30} />
            <span className="text-lg font-bold text-text-primary">{title}</span>
          </>
        ) : (
          <h1 className="truncate text-lg font-bold text-text-primary">{title}</h1>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        {!onSearchPage && (
          <Link href={ROUTES.search} aria-label={t("nav.search")}>
            <IconButton icon={<Search className="size-5" />} label={t("nav.search")} variant="ghost" />
          </Link>
        )}
        {!onMorePage && (
          <Link href={ROUTES.more} aria-label={t("nav.more")}>
            <IconButton
              icon={<MoreHorizontal className="size-5" />}
              label={t("nav.more")}
              variant="ghost"
            />
          </Link>
        )}
      </div>
    </header>
  );
}
