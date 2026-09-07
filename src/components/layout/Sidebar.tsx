"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  CalendarRange,
  Home,
  ListChecks,
  MoreHorizontal,
  Repeat2,
  Search,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useQuickAdd } from "@/components/shared/QuickAddProvider";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { trigger, icon: QuickAddIcon, label: quickAddLabel } = useQuickAdd();

  const items = [
    { href: ROUTES.home, label: t("nav.home"), icon: Home, exact: true },
    { href: ROUTES.plan, label: t("nav.today"), icon: CalendarRange, exact: false },
    { href: ROUTES.tasks, label: t("nav.tasks"), icon: ListChecks, exact: false },
    { href: ROUTES.habits, label: t("nav.habits"), icon: Repeat2, exact: false },
    { href: ROUTES.adhkar, label: t("nav.adhkar"), icon: BookOpen, exact: false },
    { href: ROUTES.appointments, label: t("nav.appointments"), icon: CalendarDays, exact: false },
    { href: ROUTES.search, label: t("nav.search"), icon: Search, exact: false },
    { href: ROUTES.more, label: t("nav.more"), icon: MoreHorizontal, exact: false },
  ];

  return (
    <aside className="sticky top-0 hidden h-dvh w-16 shrink-0 flex-col border-e border-border bg-bg-elevated px-2 py-5 md:flex lg:w-64 lg:px-3">
      <div className="mb-6 flex items-center gap-2.5 px-1 lg:px-2">
        <Logo size={32} />
        <span className="hidden text-base font-bold text-text-primary lg:inline">
          {t("common.appName")}
        </span>
      </div>

      <button
        type="button"
        onClick={trigger}
        title={quickAddLabel}
        className="mb-5 flex items-center justify-center gap-2.5 rounded-xl bg-[image:var(--brand-gradient)] px-0 py-3 text-sm font-semibold text-white shadow-glow-accent transition-transform duration-150 hover:brightness-105 active:scale-[0.98] lg:justify-start lg:px-3.5"
      >
        <QuickAddIcon className="size-5 shrink-0" strokeWidth={2.5} />
        <span className="hidden truncate lg:inline">{quickAddLabel}</span>
      </button>

      <nav className="flex flex-col gap-1">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center justify-center gap-3 rounded-xl px-0 py-2.5 text-sm font-semibold transition-colors duration-150 lg:justify-start lg:px-3.5",
                active
                  ? "bg-accent-soft text-accent-fg"
                  : "text-text-secondary hover:bg-surface-hover hover:text-text-primary",
              )}
            >
              <Icon className="size-5 shrink-0" strokeWidth={active ? 2.4 : 2} />
              <span className="hidden lg:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
