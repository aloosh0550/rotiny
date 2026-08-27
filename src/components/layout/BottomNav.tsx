"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, ListChecks, MoreHorizontal, Repeat2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useTranslation();

  const items = [
    { href: ROUTES.home, label: t("nav.home"), icon: Home, exact: true },
    { href: ROUTES.appointments, label: t("nav.appointments"), icon: CalendarDays, exact: false },
    { href: ROUTES.tasks, label: t("nav.tasks"), icon: ListChecks, exact: false },
    { href: ROUTES.habits, label: t("nav.habits"), icon: Repeat2, exact: false },
    { href: ROUTES.more, label: t("nav.more"), icon: MoreHorizontal, exact: false },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t border-border bg-bg-elevated/90 backdrop-blur-md md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="relative flex flex-1 flex-col items-center justify-center gap-1"
          >
            <span
              className={cn(
                "flex h-7 w-11 items-center justify-center rounded-full transition-colors duration-200",
                active && "bg-accent-purple/12",
              )}
            >
              <Icon
                className={cn("size-5", active ? "text-accent-purple" : "text-text-tertiary")}
                strokeWidth={active ? 2.4 : 2}
              />
            </span>
            <span
              className={cn(
                "text-[11px] font-medium transition-colors duration-200",
                active ? "text-accent-purple" : "text-text-tertiary",
              )}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
