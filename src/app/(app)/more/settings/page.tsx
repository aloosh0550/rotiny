"use client";

import { Bell, Brain, CalendarClock, Cloud, FileDown, Info, MoonStar, Shield } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { MenuList, type MenuListItem } from "@/components/more/MenuList";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { settingsRepository } from "@/lib/db/repositories";
import { ROUTES } from "@/lib/constants/routes";
import type { Locale, ThemeMode } from "@/lib/types";

export default function SettingsPage() {
  const { t, locale, setLocale } = useTranslation();
  const { theme, setTheme } = useTheme();

  // Mirrors the onboarding flow's dual-write: update the live UI immediately via the
  // provider, and persist the choice as the source of truth via the repository.
  function handleLocaleChange(next: Locale) {
    setLocale(next);
    void settingsRepository.update({ locale: next });
  }

  function handleThemeChange(next: ThemeMode) {
    setTheme(next);
    void settingsRepository.update({ theme: next });
  }

  const items: MenuListItem[] = [
    { href: ROUTES.settingsNotifications, icon: <Bell className="size-5" />, label: t("more.notifications") },
    { href: ROUTES.settingsCalendar, icon: <CalendarClock className="size-5" />, label: t("calendarSync.title") },
    { href: ROUTES.settingsPrayer, icon: <MoonStar className="size-5" />, label: t("prayer.title") },
    { href: ROUTES.settingsIntelligence, icon: <Brain className="size-5" />, label: t("more.intelligence") },
    { href: ROUTES.settingsSync, icon: <Cloud className="size-5" />, label: t("more.sync") },
    { href: ROUTES.settingsPrivacy, icon: <Shield className="size-5" />, label: t("more.privacy") },
    { href: ROUTES.settingsBackup, icon: <FileDown className="size-5" />, label: t("more.backup") },
    { href: ROUTES.settingsAbout, icon: <Info className="size-5" />, label: t("more.about") },
  ];

  return (
    <div className="flex flex-col gap-6 pb-6 pt-4">
      <section className="flex flex-col gap-2 px-4">
        <h3 className="text-sm font-semibold text-text-secondary">{t("more.language")}</h3>
        <Card className="flex gap-2">
          <Chip selected={locale === "ar"} onClick={() => handleLocaleChange("ar")}>
            {t("settings.languageArabic")}
          </Chip>
          <Chip selected={locale === "en"} onClick={() => handleLocaleChange("en")}>
            {t("settings.languageEnglish")}
          </Chip>
        </Card>
      </section>

      <section className="flex flex-col gap-2 px-4">
        <h3 className="text-sm font-semibold text-text-secondary">{t("more.theme")}</h3>
        <Card className="flex gap-2">
          <Chip selected={theme === "light"} onClick={() => handleThemeChange("light")}>
            {t("settings.themeLight")}
          </Chip>
          <Chip selected={theme === "dark"} onClick={() => handleThemeChange("dark")}>
            {t("settings.themeDark")}
          </Chip>
          <Chip selected={theme === "system"} onClick={() => handleThemeChange("system")}>
            {t("settings.themeSystem")}
          </Chip>
        </Card>
      </section>

      <section className="px-4">
        <MenuList items={items} />
      </section>
    </div>
  );
}
