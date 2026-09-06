"use client";

import {
  BarChart3,
  CalendarRange,
  Settings as SettingsIcon,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { MenuList, type MenuListItem } from "@/components/more/MenuList";
import { AccountCard } from "@/components/more/AccountCard";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { ROUTES } from "@/lib/constants/routes";

export default function MorePage() {
  const { t } = useTranslation();

  const items: MenuListItem[] = [
    { href: ROUTES.plan, icon: <CalendarRange className="size-5" />, label: t("plan.pageTitle") },
    { href: ROUTES.adhkar, icon: <Sparkles className="size-5" />, label: t("nav.adhkar") },
    { href: ROUTES.summary, icon: <TrendingUp className="size-5" />, label: t("summary.pageTitle") },
    { href: ROUTES.statistics, icon: <BarChart3 className="size-5" />, label: t("more.statistics") },
    { href: ROUTES.settings, icon: <SettingsIcon className="size-5" />, label: t("more.settings") },
  ];

  return (
    <div className="flex flex-col gap-5 pb-6 pt-4">
      <section className="px-4">
        <AccountCard />
      </section>
      <section className="px-4">
        <MenuList items={items} />
      </section>
    </div>
  );
}
