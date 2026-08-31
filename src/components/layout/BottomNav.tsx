"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { BookOpen, CalendarDays, Home, ListChecks, Repeat2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { SPRING } from "@/lib/motion";
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
    { href: ROUTES.adhkar, label: t("nav.adhkar"), icon: BookOpen, exact: false },
  ];

  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg-elevated/95 backdrop-blur-lg md:hidden">
      <div className="mx-auto flex h-16 max-w-lg items-stretch">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-0.5 pt-2 pb-1.5"
            >
              <span className="relative flex h-7 w-12 items-center justify-center">
                {active && (
                  <motion.span
                    layoutId="bottomnav-pill"
                    transition={SPRING.soft}
                    className="absolute inset-0 rounded-full bg-accent-soft"
                  />
                )}
                <Icon
                  className={cn(
                    "relative size-[21px] transition-colors",
                    active ? "text-accent-fg" : "text-text-tertiary",
                  )}
                  strokeWidth={active ? 2.4 : 2}
                />
              </span>
              <span
                className={cn(
                  "max-w-full truncate text-[10.5px] font-semibold transition-colors",
                  active ? "text-accent-fg" : "text-text-tertiary",
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
