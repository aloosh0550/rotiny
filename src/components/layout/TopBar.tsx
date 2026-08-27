"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
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
  const onSearchPage = pathname.startsWith(ROUTES.search);
  // Home already opens with its own greeting heading, and the sidebar already carries the
  // brand mark on desktop — showing "روتيني" again here would just be noise there.
  const hideOnDesktop = pathname === ROUTES.home;

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-border bg-bg/85 px-4 backdrop-blur",
        "md:static md:mx-auto md:h-auto md:w-full md:max-w-4xl md:border-none md:bg-transparent md:px-8 md:pb-0 md:pt-6 md:backdrop-blur-none",
        hideOnDesktop && "md:hidden",
      )}
    >
      <h1 className="text-lg font-semibold text-text-primary md:text-2xl md:font-bold">{title}</h1>
      {!onSearchPage && (
        <Link href={ROUTES.search} className="md:hidden">
          <IconButton icon={<Search className="size-5" />} label={t("nav.search")} variant="ghost" />
        </Link>
      )}
    </header>
  );
}
