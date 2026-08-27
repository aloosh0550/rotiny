"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, ListChecks, MoreHorizontal, Repeat2, Search, Sparkles } from "lucide-react";
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
    { href: ROUTES.appointments, label: t("nav.appointments"), icon: CalendarDays, exact: false },
    { href: ROUTES.tasks, label: t("nav.tasks"), icon: ListChecks, exact: false },
    { href: ROUTES.habits, label: t("nav.habits"), icon: Repeat2, exact: false },
    { href: ROUTES.adhkar, label: t("nav.adhkar"), icon: Sparkles, exact: false },
    { href: ROUTES.search, label: t("nav.search"), icon: Search, exact: false },
    { href: ROUTES.more, label: t("nav.more"), icon: MoreHorizontal, exact: false },
  ];

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-e border-border bg-bg-elevated px-3 py-6 md:flex">
      <div className="mb-7 flex items-center gap-2.5 px-2">
        <div
          className="flex size-8 items-center justify-center rounded-lg shadow-[0_2px_8px_-2px_rgb(139_92_246_/_0.5)]"
          style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #4f8cff 100%)" }}
        >
          <span className="text-sm font-bold text-white">ر</span>
        </div>
        <span className="text-base font-bold text-text-primary">{t("common.appName")}</span>
      </div>

      <button
        type="button"
        onClick={trigger}
        className="mb-5 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_-4px_rgb(139_92_246_/_0.55)] transition-transform duration-150 hover:brightness-110 active:scale-[0.98]"
        style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #4f8cff 100%)" }}
      >
        <QuickAddIcon className="size-4 shrink-0" strokeWidth={2.5} />
        <span className="truncate">{quickAddLabel}</span>
      </button>

      <nav className="flex flex-col gap-1">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                active
                  ? "bg-accent-purple/10 text-accent-purple"
                  : "text-text-secondary hover:bg-surface-hover hover:text-text-primary",
              )}
            >
              <Icon className="size-5" strokeWidth={active ? 2.4 : 2} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
